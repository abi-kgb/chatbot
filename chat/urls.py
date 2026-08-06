from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'chat'

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'groups', views.GroupViewSet, basename='group')
router.register(r'calls', views.CallViewSet, basename='call')
router.register(r'statuses', views.StatusViewSet, basename='status')
urlpatterns = [
    path('', include(router.urls)),
    path('conversations/<int:conversation_pk>/messages/', views.MessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='conversation-messages'),
    path('conversations/<int:conversation_pk>/messages/<int:pk>/', views.MessageViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}), name='conversation-message-detail'),
    path('conversations/<int:conversation_pk>/messages/<int:pk>/delete_for_me/', views.MessageViewSet.as_view({'post': 'delete_for_me'}), name='conversation-message-delete-for-me'),
    path('conversations/<int:conversation_pk>/messages/<int:pk>/vote_poll/', views.MessageViewSet.as_view({'post': 'vote_poll'}), name='conversation-message-vote-poll'),
    path('groups/<int:group_pk>/messages/', views.GroupMessageViewSet.as_view({'get': 'list', 'post': 'create'}), name='group-messages'),
    path('groups/<int:group_pk>/messages/<int:pk>/', views.GroupMessageViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'put': 'update', 'delete': 'destroy'}), name='group-message-detail'),
    path('groups/<int:group_pk>/messages/<int:pk>/delete_for_me/', views.GroupMessageViewSet.as_view({'post': 'delete_for_me'}), name='group-message-delete-for-me'),
    path('groups/<int:group_pk>/messages/<int:pk>/vote_poll/', views.GroupMessageViewSet.as_view({'post': 'vote_poll'}), name='group-message-vote-poll'),
    path('forward_message/', views.forward_message, name='forward-message'),
    path('messages/react/', views.react_message, name='react-message'),
    path('messages/<int:pk>/edit/', views.edit_message, name='edit-message'),
    path('messages/star/', views.toggle_star_message, name='star-message'),
    path('starred/', views.get_starred_messages, name='starred-messages'),
    path('disappearing/', views.update_disappearing, name='update-disappearing'),
    path('schedule/', views.schedule_message, name='schedule-message'),
    path('schedule/<int:pk>/', views.schedule_message, name='schedule-message-detail'),
]
