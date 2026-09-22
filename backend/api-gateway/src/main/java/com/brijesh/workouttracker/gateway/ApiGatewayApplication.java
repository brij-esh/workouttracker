package com.brijesh.workouttracker.gateway;

import com.brijesh.workouttracker.gateway.config.DownstreamServicesProperties;
import com.brijesh.workouttracker.gateway.security.GatewaySecurityProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
        GatewaySecurityProperties.class,
        DownstreamServicesProperties.class
})
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
