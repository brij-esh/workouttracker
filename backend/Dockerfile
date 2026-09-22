# Runtime-only image. Pre-build jars on the host, then:
#   copy <module>/target/<module>-*.jar -> docker-dist/<SERVICE>.jar
#   docker build --build-arg SERVICE=workout-service ...

ARG RUNTIME_IMAGE=eclipse-temurin:25-jre
FROM ${RUNTIME_IMAGE}

ARG SERVICE
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app app

COPY docker-dist/${SERVICE}.jar /app/app.jar

USER app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
