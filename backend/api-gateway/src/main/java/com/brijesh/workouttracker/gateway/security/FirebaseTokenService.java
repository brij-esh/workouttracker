package com.brijesh.workouttracker.gateway.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FirebaseTokenService {

    private final FirebaseAuth firebaseAuth;

    public FirebaseToken verifyToken(String idToken) {
        try {
            return firebaseAuth.verifyIdToken(idToken);
        } catch (Exception exception) {
            throw new InvalidFirebaseTokenException(
                    "Invalid or expired Firebase ID token",
                    exception
            );
        }
    }
}