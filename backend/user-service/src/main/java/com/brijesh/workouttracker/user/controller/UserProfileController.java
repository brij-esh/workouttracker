package com.brijesh.workouttracker.user.controller;

import com.brijesh.workouttracker.user.dto.CreateUserProfileRequest;
import com.brijesh.workouttracker.user.dto.UpdateUserProfileRequest;
import com.brijesh.workouttracker.user.dto.UserProfileResponse;
import com.brijesh.workouttracker.user.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @PostMapping
    public ResponseEntity<UserProfileResponse> createProfile(
            @RequestHeader("X-User-Id") String firebaseUid,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @Valid @RequestBody CreateUserProfileRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(userProfileService.createProfile(firebaseUid, email, request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @RequestHeader("X-User-Id") String firebaseUid
    ) {
        return ResponseEntity.ok(userProfileService.getMyProfile(firebaseUid));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMyProfile(
            @RequestHeader("X-User-Id") String firebaseUid,
            @RequestHeader(value = "X-User-Email", required = false) String email,
            @Valid @RequestBody UpdateUserProfileRequest request
    ) {
        return ResponseEntity.ok(
                userProfileService.updateMyProfile(firebaseUid, email, request)
        );
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyProfile(
            @RequestHeader("X-User-Id") String firebaseUid
    ) {
        userProfileService.deleteMyProfile(firebaseUid);
        return ResponseEntity.noContent().build();
    }
}
