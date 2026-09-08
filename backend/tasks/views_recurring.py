"""
Recurring Tasks API Views.
"""
from typing import TYPE_CHECKING

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from django.utils import timezone
from django.db.models import Q

from tasks.models import RecurringTask, RecurringTaskHistory
from tasks.serializers_recurring import (
    RecurringTaskSerializer,
    RecurringTaskDetailSerializer,
    RecurringTaskHistorySerializer
)


class RecurringTaskViewSet(viewsets.ModelViewSet):
    """Takrorlanuvchi topshiriqlar CRUD"""
    serializer_class = RecurringTaskSerializer
    permission_classes = [IsAuthenticated]
    queryset = RecurringTask.objects.none()  # Required for DRF type hints
    
    def get_queryset(self):  # type: ignore
        queryset = RecurringTask.objects.select_related('created_by').prefetch_related('organizations')
        
        # Status filter
        status_filter = self.request.query_params.get('status')  # type: ignore
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Frequency filter
        frequency = self.request.query_params.get('frequency')  # type: ignore
        if frequency:
            queryset = queryset.filter(frequency=frequency)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):  # type: ignore
        if self.action == 'retrieve':
            return RecurringTaskDetailSerializer
        return RecurringTaskSerializer
    
    def perform_create(self, serializer):
        recurring = serializer.save(created_by=self.request.user)
        # Birinchi run sanasini hisoblash
        recurring.calculate_next_run()
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """To'xtatib turish"""
        recurring = self.get_object()
        recurring.status = 'PAUSED'
        recurring.save()
        return Response({'message': 'To\'xtatib qo\'yildi'})
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Davom ettirish"""
        recurring = self.get_object()
        recurring.status = 'ACTIVE'
        recurring.calculate_next_run()
        return Response({'message': 'Davom ettirildi'})
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Hozir ishga tushirish"""
        recurring = self.get_object()
        task = recurring.create_task_instance()
        
        if task:
            return Response({
                'message': 'Topshiriq yaratildi',
                'task_id': task.id
            })
        return Response(
            {'error': 'Topshiriq yaratishda xatolik'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Yaratilgan topshiriqlar tarixi"""
        recurring = self.get_object()
        history = RecurringTaskHistory.objects.filter(
            recurring_task=recurring
        ).select_related('created_task').order_by('-created_at')[:20]
        
        return Response(RecurringTaskHistorySerializer(history, many=True).data)
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Yaqin kunlarda ishga tushadiganlar"""
        from datetime import timedelta
        
        next_week = timezone.now() + timedelta(days=7)
        upcoming = RecurringTask.objects.filter(
            status='ACTIVE',
            next_run_date__lte=next_week
        ).order_by('next_run_date')[:10]
        
        return Response(RecurringTaskSerializer(upcoming, many=True).data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Takrorlanuvchi topshiriqlar statistikasi"""
        from django.db.models import Sum, Count
        
        total = RecurringTask.objects.count()
        active = RecurringTask.objects.filter(status='ACTIVE').count()
        paused = RecurringTask.objects.filter(status='PAUSED').count()
        
        by_frequency = dict(
            RecurringTask.objects.values_list('frequency')
            .annotate(count=Count('id'))
        )
        
        total_created = RecurringTask.objects.aggregate(
            total=Sum('total_created')
        )['total'] or 0
        
        return Response({
            'total': total,
            'active': active,
            'paused': paused,
            'by_frequency': by_frequency,
            'total_tasks_created': total_created
        })
