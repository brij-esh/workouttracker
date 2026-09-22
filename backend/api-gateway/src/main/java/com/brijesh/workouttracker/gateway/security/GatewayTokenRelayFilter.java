package com.brijesh.workouttracker.gateway.security;

import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Strips any client-supplied gateway token and attaches the trusted secret
 * so only this gateway can call downstream services.
 */
@Component
@RequiredArgsConstructor
public class GatewayTokenRelayFilter implements GlobalFilter, Ordered {

    static final String GATEWAY_TOKEN_HEADER = "X-Gateway-Token";

    private final GatewaySecurityProperties properties;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = properties.getGatewayToken();
        if (!StringUtils.hasText(token)) {
            return chain.filter(exchange);
        }

        ServerWebExchange mutated = exchange.mutate()
                .request(request -> request.headers(headers -> {
                    headers.remove(GATEWAY_TOKEN_HEADER);
                    headers.set(GATEWAY_TOKEN_HEADER, token);
                }))
                .build();

        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        // After FirebaseAuthenticationFilter (-100): auth first, then stamp internal token.
        return -90;
    }
}
