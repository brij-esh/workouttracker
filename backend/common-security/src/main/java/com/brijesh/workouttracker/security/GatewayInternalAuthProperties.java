package com.brijesh.workouttracker.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "workout.security")
public class GatewayInternalAuthProperties {

    /**
     * Shared secret that only the API Gateway should send.
     * Downstream services reject requests without a matching value.
     */
    private String gatewayToken = "";

    /**
     * When false, the servlet filter is not registered (useful only for isolated unit tests).
     */
    private boolean requireGatewayToken = true;

    public String getGatewayToken() {
        return gatewayToken;
    }

    public void setGatewayToken(String gatewayToken) {
        this.gatewayToken = gatewayToken;
    }

    public boolean isRequireGatewayToken() {
        return requireGatewayToken;
    }

    public void setRequireGatewayToken(boolean requireGatewayToken) {
        this.requireGatewayToken = requireGatewayToken;
    }
}
