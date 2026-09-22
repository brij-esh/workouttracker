package com.brijesh.workouttracker.nutrition.service;

import com.brijesh.workouttracker.nutrition.dto.NutritionTargetRequest;
import com.brijesh.workouttracker.nutrition.dto.NutritionTargetResponse;
import com.brijesh.workouttracker.nutrition.entity.NutritionTarget;
import com.brijesh.workouttracker.nutrition.repository.NutritionTargetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NutritionTargetService {

    private final NutritionTargetRepository nutritionTargetRepository;

    public NutritionTargetResponse get(String userId) {
        return nutritionTargetRepository.findByUserId(userId)
                .map(NutritionTargetResponse::fromEntity)
                .orElseThrow(() -> new NutritionResourceNotFoundException(
                        "Nutrition targets not found for user"
                ));
    }

    @Transactional
    public NutritionTargetResponse create(String userId, NutritionTargetRequest request) {
        if (nutritionTargetRepository.existsByUserId(userId)) {
            throw new NutritionConflictException(
                    "Nutrition targets already exist for this user"
            );
        }

        NutritionTarget target = new NutritionTarget();
        target.setUserId(userId);
        apply(target, request);
        return NutritionTargetResponse.fromEntity(nutritionTargetRepository.save(target));
    }

    @Transactional
    public NutritionTargetResponse upsert(String userId, NutritionTargetRequest request) {
        NutritionTarget target = nutritionTargetRepository.findByUserId(userId)
                .orElseGet(() -> {
                    NutritionTarget created = new NutritionTarget();
                    created.setUserId(userId);
                    return created;
                });

        apply(target, request);
        if (target.getId() != null) {
            target.setUpdatedAt(Instant.now());
        }
        return NutritionTargetResponse.fromEntity(nutritionTargetRepository.saveAndFlush(target));
    }

    private void apply(NutritionTarget target, NutritionTargetRequest request) {
        target.setCalorieTarget(request.calorieTarget());
        target.setProteinGTarget(request.proteinGTarget());
        target.setCarbsGTarget(request.carbsGTarget());
        target.setFatGTarget(request.fatGTarget());
        target.setFiberGTarget(request.fiberGTarget());
        target.setWaterMlTarget(request.waterMlTarget());
        target.setNutritionGoal(request.nutritionGoal());
        target.setManualOverride(Boolean.TRUE.equals(request.manualOverride()));
        if (request.waterRemindersEnabled() != null) {
            target.setWaterRemindersEnabled(request.waterRemindersEnabled());
        }
    }
}
