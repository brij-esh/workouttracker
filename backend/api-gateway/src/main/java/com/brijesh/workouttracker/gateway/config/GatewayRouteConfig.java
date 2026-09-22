package com.brijesh.workouttracker.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRouteConfig {

    @Bean
    public RouteLocator gatewayRoutes(
            RouteLocatorBuilder builder,
            DownstreamServicesProperties services
    ) {
        return builder.routes()
                .route("user-service", route -> route
                        .path("/api/v1/users/**")
                        .uri(services.user()))
                .route("workout-service", route -> route
                        .path(
                                "/api/v1/workouts/**",
                                "/api/v1/workout-plans/**",
                                "/api/v1/exercises/**",
                                "/api/v1/routines/**",
                                "/api/v1/strength-progress",
                                "/api/v1/strength-progress/**"
                        )
                        .uri(services.workout()))
                .route("progress-service", route -> route
                        .path(
                                "/api/v1/progress/**",
                                "/api/v1/body-measurements/**"
                        )
                        .uri(services.progress()))
                .route("nutrition-service", route -> route
                        .path(
                                "/api/v1/nutrition/**",
                                "/api/v1/water/**"
                        )
                        .uri(services.nutrition()))
                .route("notification-service", route -> route
                        .path("/api/v1/notifications/**")
                        .uri(services.notification()))
                .build();
    }
}
