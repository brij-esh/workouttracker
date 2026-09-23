package com.brijesh.workouttracker.gateway.security;

import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class FirebaseAuthenticationFilter
        implements GlobalFilter, Ordered {

    private final FirebaseTokenService firebaseTokenService;

    @Override
    public Mono<Void> filter(
            ServerWebExchange exchange,
            GatewayFilterChain chain
    ) {

        // CORS preflight must not require a Firebase token.
        if (HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod())) {
            return chain.filter(exchange);
        }

        String path = exchange.getRequest()
                .getURI()
                .getPath();

        if (isPublicEndpoint(path)) {
            return chain.filter(exchange);
        }

        String authorizationHeader = exchange.getRequest()
                .getHeaders()
                .getFirst(HttpHeaders.AUTHORIZATION);

        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {

            return unauthorized(exchange);
        }

        String idToken = authorizationHeader.substring(7).trim();

        if (idToken.isBlank()) {
            return unauthorized(exchange);
        }

        try {
            FirebaseToken firebaseToken =
                    firebaseTokenService.verifyToken(idToken);

            String firebaseUid = firebaseToken.getUid();
            String email = firebaseToken.getEmail();

            ServerWebExchange mutatedExchange =
                    exchange.mutate()
                            .request(request -> request
                                    .headers(headers -> {
                                        headers.remove("X-User-Id");
                                        headers.remove("X-User-Email");

                                        headers.add(
                                                "X-User-Id",
                                                firebaseUid
                                        );

                                        if (email != null) {
                                            headers.add(
                                                    "X-User-Email",
                                                    email
                                            );
                                        }
                                    })
                            )
                            .build();

            return chain.filter(mutatedExchange);

        } catch (InvalidFirebaseTokenException exception) {
            return unauthorized(exchange);
        }
    }

    private boolean isPublicEndpoint(String path) {
        return path.equals("/actuator/health")
                || path.equals("/api/v1/auth/public")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse()
                .setStatusCode(HttpStatus.UNAUTHORIZED);

        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -100;
    }
}