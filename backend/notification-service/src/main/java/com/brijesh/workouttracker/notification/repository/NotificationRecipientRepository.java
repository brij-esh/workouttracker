package com.brijesh.workouttracker.notification.repository;

import com.brijesh.workouttracker.notification.entity.NotificationRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, String> {
}
