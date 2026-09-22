package com.brijesh.workouttracker.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "workout.services")
public record DownstreamServicesProperties(
        String user,
        String workout,
        String progress,
        String nutrition,
        String notification
) {
}
