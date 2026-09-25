FROM alpine:3.20

# Keep in sync with PB_VERSION in .github/workflows/ci.yml: the hooks are tested against that version.
ARG PB_VERSION=0.39.10

RUN apk add --no-cache unzip ca-certificates tzdata && \
    wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb && \
    rm /tmp/pb.zip

WORKDIR /pb
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
ENV TZ=Asia/Jerusalem
EXPOSE 8090

# Auto-bootstrap superuser if credentials are provided in the environment.
CMD ["sh", "-c", "if [ -n \"$PB_SUPERUSER_EMAIL\" ] && [ -n \"$PB_SUPERUSER_PASSWORD\" ]; then /pb/pocketbase superuser upsert \"$PB_SUPERUSER_EMAIL\" \"$PB_SUPERUSER_PASSWORD\" --dir=/pb/pb_data; fi && exec /pb/pocketbase serve --http=0.0.0.0:${PORT:-8090} --dir=/pb/pb_data"]
