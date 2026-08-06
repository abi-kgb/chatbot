from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=4)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone_number', 'status_message', 'avatar', 'last_seen', 'password')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'phone_number', 'status_message')

    def create(self, validated_data):
        import uuid
        phone = validated_data.get('phone_number')
        if not phone or not phone.strip():
            phone = f"+1{uuid.uuid4().hex[:10]}"
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            phone_number=phone,
            status_message=validated_data.get('status_message', 'Hey there! I am using WhatsApp Clone.')
        )
        return user

from .models import Contact

class ContactSerializer(serializers.ModelSerializer):
    contact_user = UserSerializer(read_only=True)
    contact_user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='contact_user', write_only=True
    )

    class Meta:
        model = Contact
        fields = ('id', 'contact_user', 'contact_user_id', 'saved_name')
