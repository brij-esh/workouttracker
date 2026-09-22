package com.brijesh.workouttracker.nutrition.service;

import com.brijesh.workouttracker.nutrition.domain.FoodCategory;
import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.domain.FoodRegion;
import com.brijesh.workouttracker.nutrition.dto.FoodItemRequest;
import com.brijesh.workouttracker.nutrition.dto.FoodItemResponse;
import com.brijesh.workouttracker.nutrition.dto.FoodLibraryMetaResponse;
import com.brijesh.workouttracker.nutrition.entity.FoodItem;
import com.brijesh.workouttracker.nutrition.repository.FoodItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FoodItemService {

    private static final int MAX_RESULTS = 60;

    private final FoodItemRepository foodItemRepository;

    public FoodLibraryMetaResponse meta() {
        return FoodLibraryMetaResponse.defaults();
    }

    public List<FoodItemResponse> search(
            String userId,
            String q,
            FoodCategory category,
            FoodRegion region
    ) {
        String query = q != null && !q.isBlank() ? q.trim() : null;
        return foodItemRepository.search(userId, query, category, region).stream()
                .limit(MAX_RESULTS)
                .map(FoodItemResponse::fromEntity)
                .toList();
    }

    public FoodItemResponse get(String userId, UUID id) {
        return FoodItemResponse.fromEntity(findVisible(userId, id));
    }

    @Transactional
    public FoodItemResponse create(String userId, FoodItemRequest request) {
        FoodItem food = new FoodItem();
        food.setUserId(userId);
        food.setSystemFood(false);
        apply(food, request);
        return FoodItemResponse.fromEntity(foodItemRepository.save(food));
    }

    @Transactional
    public FoodItemResponse update(String userId, UUID id, FoodItemRequest request) {
        FoodItem food = findOwnedCustom(userId, id);
        apply(food, request);
        return FoodItemResponse.fromEntity(foodItemRepository.saveAndFlush(food));
    }

    @Transactional
    public void delete(String userId, UUID id) {
        FoodItem food = findOwnedCustom(userId, id);
        food.setArchived(true);
        foodItemRepository.saveAndFlush(food);
    }

    private FoodItem findVisible(String userId, UUID id) {
        FoodItem food = foodItemRepository.findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new NutritionResourceNotFoundException("Food", id));
        if (food.isSystemFood() || userId.equals(food.getUserId())) {
            return food;
        }
        throw new NutritionResourceNotFoundException("Food", id);
    }

    private FoodItem findOwnedCustom(String userId, UUID id) {
        FoodItem food = findVisible(userId, id);
        if (food.isSystemFood() || !userId.equals(food.getUserId())) {
            throw new NutritionConflictException("Only your custom foods can be changed");
        }
        return food;
    }

    private void apply(FoodItem food, FoodItemRequest request) {
        food.setName(request.name().trim());
        food.setCategory(request.category() != null ? request.category() : FoodCategory.CUSTOM);
        food.setRegion(request.region() != null ? request.region() : FoodRegion.OTHER);
        food.setServingQty(request.servingQty());
        food.setServingUnit(
                request.servingUnit() != null ? request.servingUnit() : FoodQuantityUnit.GRAMS
        );
        food.setCalories(request.calories());
        food.setProteinG(defaultZero(request.proteinG()));
        food.setCarbsG(defaultZero(request.carbsG()));
        food.setFatG(defaultZero(request.fatG()));
    }

    private static BigDecimal defaultZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
