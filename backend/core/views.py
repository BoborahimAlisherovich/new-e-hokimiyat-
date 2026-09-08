from rest_framework import viewsets, permissions
from rest_framework.response import Response

from .models import SystemSettings
from .serializers import SystemSettingsSerializer


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """System settings API (singleton)."""

    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        obj, _ = SystemSettings.objects.get_or_create(pk=1)
        return obj

    def list(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
