from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'chat'

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'groups', views.GroupViewSet, basename='group')
router.register(r'calls', views.CallViewSet, basename='call')
urlpatterns = [
    path('', include(router.urls)),
    path('conversations/<int:conversation_pk>/messages/', views.MessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='conversation-messages'),
    path('conversations/<int:conversation_pk>/messages/<int:pk>/', views.MessageViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}), name='conversation-message-detail'),
    path('groups/<int:group_pk>/messages/', views.GroupMessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='group-messages'),
    path('groups/<int:group_pk>/messages/<int:pk>/', views.GroupMessageViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}), name='group-message-detail'),
    path('forward_message/', views.forward_message, name='forward-message'),
]
