package com.brijesh.workouttracker.user.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.events.KafkaTopics;
import com.brijesh.workouttracker.events.UserRegisteredEvent;
import com.brijesh.workouttracker.user.domain.PreferredUnits;
import com.brijesh.workouttracker.user.dto.CreateUserProfileRequest;
import com.brijesh.workouttracker.user.dto.UpdateUserProfileRequest;
import com.brijesh.workouttracker.user.dto.UserProfileResponse;
import com.brijesh.workouttracker.user.entity.UserProfile;
import com.brijesh.workouttracker.user.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;
    private final DomainEventPublisher domainEventPublisher;

    public UserProfileResponse getMyProfile(String firebaseUid) {
        return UserProfileResponse.fromEntity(findOwnedProfile(firebaseUid));
    }

    @Transactional
    public UserProfileResponse createProfile(
            String firebaseUid,
            String email,
            CreateUserProfileRequest request
    ) {
        if (userProfileRepository.existsByFirebaseUid(firebaseUid)) {
            throw new UserAlreadyExistsException(firebaseUid);
        }

        UserProfile profile = new UserProfile();
        profile.setFirebaseUid(firebaseUid);
        profile.setEmail(email);
        applyCreateRequest(profile, request);

        UserProfile saved = userProfileRepository.save(profile);
        domainEventPublisher.publish(
                KafkaTopics.USER_EVENTS,
                saved.getFirebaseUid(),
                new UserRegisteredEvent(
                        saved.getId(),
                        saved.getFirebaseUid(),
                        saved.getEmail(),
                        saved.getDisplayName(),
                        Instant.now()
                )
        );
        return UserProfileResponse.fromEntity(saved);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(
            String firebaseUid,
            String email,
            UpdateUserProfileRequest request
    ) {
        UserProfile profile = findOwnedProfile(firebaseUid);
        applyUpdateRequest(profile, request);
        if (email != null && !email.isBlank()) {
            profile.setEmail(email.trim());
        }
        profile.setUpdatedAt(Instant.now());

        UserProfile saved = userProfileRepository.saveAndFlush(profile);
        return UserProfileResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteMyProfile(String firebaseUid) {
        UserProfile profile = findOwnedProfile(firebaseUid);
        userProfileRepository.delete(profile);
    }

    private UserProfile findOwnedProfile(String firebaseUid) {
        return userProfileRepository
                .findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new UserNotFoundException(firebaseUid));
    }

    private void applyCreateRequest(
            UserProfile profile,
            CreateUserProfileRequest request
    ) {
        profile.setDisplayName(request.displayName());
        profile.setHeightCm(request.heightCm());
        profile.setWeightKg(request.weightKg());
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setGender(request.gender());
        profile.setFitnessGoal(request.fitnessGoal());
        profile.setActivityLevel(request.activityLevel());
        profile.setPreferredUnits(
                request.preferredUnits() != null
                        ? request.preferredUnits()
                        : PreferredUnits.METRIC
        );
        profile.setTimezone(normalizeTimezone(request.timezone()));
        profile.setRegion(normalizeRegion(request.region()));
        profile.setOnboardingCompleted(
                Boolean.TRUE.equals(request.onboardingCompleted())
        );
    }

    private void applyUpdateRequest(
            UserProfile profile,
            UpdateUserProfileRequest request
    ) {
        profile.setDisplayName(request.displayName());
        profile.setHeightCm(request.heightCm());
        profile.setWeightKg(request.weightKg());
        profile.setDateOfBirth(request.dateOfBirth());
        profile.setGender(request.gender());
        profile.setFitnessGoal(request.fitnessGoal());
        profile.setActivityLevel(request.activityLevel());
        profile.setPreferredUnits(
                request.preferredUnits() != null
                        ? request.preferredUnits()
                        : PreferredUnits.METRIC
        );
        profile.setTimezone(normalizeTimezone(request.timezone()));
        profile.setRegion(normalizeRegion(request.region()));
        if (request.onboardingCompleted() != null) {
            profile.setOnboardingCompleted(request.onboardingCompleted());
        }
    }

    private static String normalizeTimezone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return null;
        }
        String trimmed = timezone.trim();
        try {
            return ZoneId.of(trimmed).getId();
        } catch (Exception ignored) {
            throw new UserBadRequestException("Invalid timezone: " + trimmed);
        }
    }

    private static String normalizeRegion(String region) {
        if (region == null || region.isBlank()) {
            return null;
        }
        String code = region.trim().toUpperCase(Locale.ROOT);
        if (!code.matches("[A-Z]{2}")) {
            throw new UserBadRequestException("Region must be a 2-letter country code");
        }
        return code;
    }
}
