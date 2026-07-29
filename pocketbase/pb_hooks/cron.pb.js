cronAdd("cleanupPendingAppointments", "0 */2 * * *", () => {
    // Calculate date limit: 48 hours ago
    const limitDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    // Format to SQLite-compatible YYYY-MM-DD HH:MM:SS format
    const limitStr = limitDate.toISOString().replace('T', ' ').substring(0, 19);

    // Find pending appointments created more than 48 hours ago
    const appointments = $app.dao().findRecordsByFilter(
        "appointments",
        "status = 'pending' && created < {:limit}",
        "-created",
        100,
        0,
        { limit: limitStr }
    );

    for (const appt of appointments) {
        $app.dao().runInTransaction((txDao) => {
            // Cancel the appointment
            appt.set("status", "cancelled");
            txDao.saveRecord(appt);

            // Also release the conversation state if it is currently stuck waiting
            const customerId = appt.get("customer");
            try {
                const conv = txDao.findFirstRecordByFilter(
                    "conversations",
                    "customer = {:customerId}",
                    { customerId: customerId }
                );
                const currentState = conv.get("state");
                if (currentState === "AWAIT_PRICE_OFFER" || currentState === "AWAIT_PAYMENT" || currentState === "AWAIT_FINAL_CONFIRMATION") {
                    conv.set("state", "COLLECTING_INFO");
                    txDao.saveRecord(conv);
                }
            } catch (e) {
                // Conversation might not exist or state is already different
            }
        });
    }
});
