from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    phone_number = models.CharField(max_length=15, unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    status_message = models.CharField(max_length=255, default='Hey there! I am using WhatsApp Clone.')
    last_seen = models.DateTimeField(null=True, blank=True)
    blocked_users = models.ManyToManyField('self', symmetrical=False, blank=True)

    def __str__(self):
        return self.username

class Contact(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacts')
    contact_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contacted_by')
    saved_name = models.CharField(max_length=255)
    
    class Meta:
        unique_together = ('user', 'contact_user')

    def __str__(self):
        return f"{self.user.username}'s contact: {self.saved_name} ({self.contact_user.username})"
