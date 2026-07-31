from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

app_name = 'users'

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    path('search/', views.UserSearchView.as_view(), name='user_search'),
    path('heartbeat/', views.HeartbeatView.as_view(), name='heartbeat'),
    path('block/<int:user_id>/', views.BlockUserView.as_view(), name='block_user'),
    path('unblock/<int:user_id>/', views.UnblockUserView.as_view(), name='unblock_user'),
]

from rest_framework.routers import DefaultRouter
router = DefaultRouter()
router.register(r'contacts', views.ContactViewSet, basename='contact')
urlpatterns += router.urls
