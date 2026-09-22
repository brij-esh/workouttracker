package com.brijesh.workouttracker.notification.repository;

import com.brijesh.workouttracker.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findAllByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    Page<Notification> findAllByUserIdAndReadFalseOrderByCreatedAtDesc(String userId, Pageable pageable);

    Optional<Notification> findByIdAndUserId(UUID id, String userId);

    long countByUserIdAndReadFalse(String userId);

    boolean existsByUserIdAndReferenceId(String userId, String referenceId);

    @Query("select distinct n.userId from Notification n")
    List<String> findDistinctUserIds();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification n
            set n.read = true,
                n.readAt = :readAt,
                n.updatedAt = :readAt
            where n.userId = :userId
              and n.read = false
            """)
    int markAllReadForUser(
            @Param("userId") String userId,
            @Param("readAt") Instant readAt
    );

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from Notification n where n.userId = :userId")
    int deleteAllByUserId(@Param("userId") String userId);
}
