package com.brijesh.workouttracker.nutrition.entity;

import com.brijesh.workouttracker.nutrition.domain.FoodCategory;
import com.brijesh.workouttracker.nutrition.domain.FoodQuantityUnit;
import com.brijesh.workouttracker.nutrition.domain.FoodRegion;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "food_items")
@Getter
@Setter
@NoArgsConstructor
public class FoodItem {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", length = 128, updatable = false)
    private String userId;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FoodCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FoodRegion region = FoodRegion.PAN_INDIA;

    @Column(name = "serving_qty", nullable = false, precision = 10, scale = 2)
    private BigDecimal servingQty;

    @Enumerated(EnumType.STRING)
    @Column(name = "serving_unit", nullable = false, length = 20)
    private FoodQuantityUnit servingUnit = FoodQuantityUnit.GRAMS;

    @Column(nullable = false)
    private Integer calories;

    @Column(name = "protein_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal proteinG = BigDecimal.ZERO;

    @Column(name = "carbs_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal carbsG = BigDecimal.ZERO;

    @Column(name = "fat_g", nullable = false, precision = 7, scale = 2)
    private BigDecimal fatG = BigDecimal.ZERO;

    @Column(name = "is_system", nullable = false)
    private boolean systemFood = false;

    @Column(nullable = false)
    private boolean archived = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (region == null) {
            region = FoodRegion.PAN_INDIA;
        }
        if (servingUnit == null) {
            servingUnit = FoodQuantityUnit.GRAMS;
        }
        archived = false;
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}
