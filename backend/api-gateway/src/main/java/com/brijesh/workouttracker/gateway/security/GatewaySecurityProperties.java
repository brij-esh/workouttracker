package com.brijesh.workouttracker.gateway.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "workout.security")
public class GatewaySecurityProperties {

    /**
     * Shared secret injected into downstream requests as X-Gateway-Token.
     */
    private String gatewayToken = "";

    public String getGatewayToken() {
        return gatewayToken;
    }

    public void setGatewayToken(String gatewayToken) {
        this.gatewayToken = gatewayToken;
    }
}
