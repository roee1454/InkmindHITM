FROM alpine:3.20

ARG PB_VERSION=0.39.7

RUN apk add --no-cache unzip ca-certificates && \
    wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip -O /tmp/pb.zip && \
    unzip /tmp/pb.zip -d /pb && \
    rm /tmp/pb.zip

WORKDIR /pb
EXPOSE 8090

# Render injects $PORT; PocketBase must bind to it, not the hardcoded 8090 default.
CMD ["sh", "-c", "/pb/pocketbase serve --http=0.0.0.0:${PORT:-8090} --dir=/pb/pb_data"]
