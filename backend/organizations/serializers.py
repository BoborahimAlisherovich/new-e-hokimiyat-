"""
Organization serializers for E-Hokimiyat API.
"""

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
