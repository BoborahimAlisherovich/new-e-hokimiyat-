"""
User management URL patterns.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import PositionViewSet, UserViewSet, UserAssignmentViewSet

router = DefaultRouter()

# TARTIB MUHIM. `UserViewSet` bo'sh prefiks bilan ro'yxatdan o'tadi, ya'ni
# uning `^(?P<pk>[^/.]+)/$` marshruti /api/users/ ostidagi ISTALGAN yo'lni
# ushlab qoladi. Agar u birinchi tursa, `/api/users/assignments/` so'rovi
# «pk = "assignments"» deb talqin qilinardi va 404 qaytarardi.
# Shuning uchun aniq prefiksli viewsetlar AVVAL, bo'sh prefiks ENG OXIRIDA.
router.register('positions', PositionViewSet, basename='user-position')
router.register('assignments', UserAssignmentViewSet, basename='user-assignment')
router.register('', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
]
