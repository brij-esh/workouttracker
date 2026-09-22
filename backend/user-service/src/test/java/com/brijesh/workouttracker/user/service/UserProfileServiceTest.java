package com.brijesh.workouttracker.user.service;

import com.brijesh.workouttracker.events.DomainEventPublisher;
import com.brijesh.workouttracker.user.domain.ActivityLevel;
import com.brijesh.workouttracker.user.domain.FitnessGoal;
import com.brijesh.workouttracker.user.domain.Gender;
import com.brijesh.workouttracker.user.domain.PreferredUnits;
import com.brijesh.workouttracker.user.dto.CreateUserProfileRequest;
import com.brijesh.workouttracker.user.dto.UpdateUserProfileRequest;
import com.brijesh.workouttracker.user.entity.UserProfile;
import com.brijesh.workouttracker.user.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private DomainEventPublisher domainEventPublisher;

    @InjectMocks
    private UserProfileService userProfileService;

    @Test
    void shouldCreateProfileForNewUser() {
        String firebaseUid = "firebase-user-123";
        CreateUserProfileRequest request = new CreateUserProfileRequest(
                "Brijesh",
                new BigDecimal("175.50"),
                new BigDecimal("72.00"),
                LocalDate.of(1995, 5, 20),
                Gender.MALE,
                FitnessGoal.BUILD_MUSCLE,
                ActivityLevel.MODERATE,
                PreferredUnits.METRIC,
                "Asia/Kolkata",
                "IN",
                true
        );

        when(userProfileRepository.existsByFirebaseUid(firebaseUid))
                .thenReturn(false);
        when(userProfileRepository.save(any(UserProfile.class)))
                .thenAnswer(invocation -> {
                    UserProfile profile = invocation.getArgument(0);
                    profile.setId(UUID.randomUUID());
                    return profile;
                });

        var response = userProfileService.createProfile(
                firebaseUid,
                "user@example.com",
                request
        );

        assertEquals(firebaseUid, response.firebaseUid());
        assertEquals("Brijesh", response.displayName());
        assertEquals("user@example.com", response.email());
        assertTrue(response.onboardingCompleted());
        verify(userProfileRepository).save(any(UserProfile.class));
    }

    @Test
    void shouldRejectCreateWhenProfileAlreadyExists() {
        String firebaseUid = "firebase-user-123";
        CreateUserProfileRequest request = new CreateUserProfileRequest(
                "Brijesh",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false
        );

        when(userProfileRepository.existsByFirebaseUid(firebaseUid))
                .thenReturn(true);

        assertThrows(
                UserAlreadyExistsException.class,
                () -> userProfileService.createProfile(
                        firebaseUid,
                        "user@example.com",
                        request
                )
        );

        verify(userProfileRepository, never()).save(any());
    }

    @Test
    void shouldUpdateOwnedProfile() {
        String firebaseUid = "firebase-user-123";
        UserProfile profile = new UserProfile();
        profile.setId(UUID.randomUUID());
        profile.setFirebaseUid(firebaseUid);
        profile.setDisplayName("Old Name");
        profile.setPreferredUnits(PreferredUnits.METRIC);
        profile.setOnboardingCompleted(false);

        UpdateUserProfileRequest request = new UpdateUserProfileRequest(
                "New Name",
                new BigDecimal("180.00"),
                new BigDecimal("75.00"),
                LocalDate.of(1995, 5, 20),
                Gender.MALE,
                FitnessGoal.STAY_FIT,
                ActivityLevel.ACTIVE,
                PreferredUnits.IMPERIAL,
                "America/New_York",
                "US",
                true
        );

        when(userProfileRepository.findByFirebaseUid(firebaseUid))
                .thenReturn(Optional.of(profile));
        when(userProfileRepository.saveAndFlush(profile)).thenReturn(profile);

        var response = userProfileService.updateMyProfile(firebaseUid, "new@example.com", request);

        assertEquals("New Name", response.displayName());
        assertEquals("new@example.com", response.email());
        assertEquals(PreferredUnits.IMPERIAL, response.preferredUnits());
        assertTrue(response.onboardingCompleted());
        verify(userProfileRepository).saveAndFlush(profile);
    }

    @Test
    void shouldRejectGetWhenProfileMissing() {
        String firebaseUid = "missing-user";

        when(userProfileRepository.findByFirebaseUid(firebaseUid))
                .thenReturn(Optional.empty());

        assertThrows(
                UserNotFoundException.class,
                () -> userProfileService.getMyProfile(firebaseUid)
        );
    }
}
