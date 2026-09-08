"""
Organization serializers for E-Hokimiyat API.
"""

import re

from rest_framework import serializers
from .models import Organization, Sector


class SectorSerializer(serializers.ModelSerializer):
    """
    Sector serializer.
    """
    organization_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sector
        fields = ['id', 'name', 'description', 'is_active', 'organization_count']
    
    def get_organization_count(self, obj):
        return obj.organizations.filter(is_active=True).count()


class OrganizationMinimalSerializer(serializers.ModelSerializer):
    """
    Minimal organization serializer for nested relations.
    """
    class Meta:
        model = Organization
        fields = ['id', 'name', 'short_name']


class OrganizationSerializer(serializers.ModelSerializer):
    """
    Full organization serializer.
    """
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    employee_count = serializers.IntegerField(read_only=True)
    active_tasks_count = serializers.IntegerField(read_only=True)
    director_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'short_name', 'parent', 'parent_name',
            'sector', 'sector_name', 'region', 'district', 'address',
            'phone', 'email', 'website', 'director_name',
            'is_active', 'employee_count', 'active_tasks_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_director_name(self, obj):
        """Tashkilot rahbarini avval model field'dan, keyin employees'dan qidiradi."""
        # Avval model field tekshiriladi
        if obj.director_name:
            return obj.director_name
        # Prefetch qilingan employees'dan rahbarni topish
        if hasattr(obj, '_prefetched_objects_cache') and 'employees' in obj._prefetched_objects_cache:
            for emp in obj._prefetched_objects_cache['employees']:
                if emp.role == 'TASHKILOT_RAHBARI' and emp.status == 'FAOL':
                    return emp.full_name
        else:
            # Prefetch yo'q bo'lsa query orqali
            rahbar = obj.employees.filter(
                role='TASHKILOT_RAHBARI', status='FAOL'
            ).values_list('first_name', 'last_name', 'middle_name').first()
            if rahbar:
                first_name, last_name, middle_name = rahbar
                parts = [last_name, first_name, middle_name]
                return ' '.join(p for p in parts if p).strip() or None
        return None

    def validate_phone(self, value):
        phone = (value or '').strip()
        if phone and not re.fullmatch(r'^\+?[0-9\s()-]{7,20}$', phone):
            raise serializers.ValidationError("Telefon maydoniga faqat raqam, +, bo'sh joy, qavs va - kiritish mumkin")
        return phone

    def validate_email(self, value):
        return (value or '').strip()


class OrganizationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating organizations.
    """
    class Meta:
        model = Organization
        fields = [
            'name', 'short_name', 'parent', 'sector',
            'region', 'district', 'address', 'phone',
            'email', 'website', 'director_name'
        ]

    def validate_phone(self, value):
        phone = (value or '').strip()
        if phone and not re.fullmatch(r'^\+?[0-9\s()-]{7,20}$', phone):
            raise serializers.ValidationError("Telefon maydoniga faqat raqam, +, bo'sh joy, qavs va - kiritish mumkin")
        return phone

    def validate_email(self, value):
        return (value or '').strip()


class OrganizationStatsSerializer(serializers.Serializer):
    """
    Organization statistics serializer.
    """
    organization = OrganizationMinimalSerializer()
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    overdue_tasks = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    average_completion_time = serializers.FloatField()
    rating = serializers.FloatField()
