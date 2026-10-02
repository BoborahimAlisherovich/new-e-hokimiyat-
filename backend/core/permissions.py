"""
Core permissions - Role-based access control for E-Hokimiyat.
"""

from rest_framework import permissions


class RolePermission(permissions.BasePermission):
    """
    Base permission class for role-based access control.
    """
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles


class IsHokim(RolePermission):
    """
    Permission for Hokim (Mayor) role.
    """
    allowed_roles = ['HOKIM']


class IsHokimOrAssistant(RolePermission):
    """
    Permission for Hokim or Hokim Yordamchisi roles.
    Includes AI Assistant access.
    """
    allowed_roles = ['HOKIM', 'HOKIM_YORDAMCHISI']


class IsHokimOrHokimlikMasul(RolePermission):
    """
    Permission for Hokim or Hokimlik Mas'uli roles.
    """
    allowed_roles = ['HOKIM', 'HOKIMLIK_MASUL']


class IsTashkilotRahbari(RolePermission):
    """
    Permission for Tashkilot Rahbari (Organization Director) role.
    """
    allowed_roles = ['TASHKILOT_RAHBARI']


class IsTashkilotMasul(RolePermission):
    """
    Permission for Tashkilot Mas'uli (Organization Responsible) role.
    """
    allowed_roles = ['TASHKILOT_MASUL']


class CanManageUsers(permissions.BasePermission):
    """
    Permission to manage users based on hierarchy.
    
    Hierarchy:
    - Hokim can add: Hokimlik mas'uli, Tashkilot rahbari, Tashkilot mas'uli
    - Hokimlik mas'uli can add: Tashkilot rahbari, Tashkilot mas'uli
    - Tashkilot rahbari can add: Tashkilot mas'uli
    - Tashkilot mas'uli cannot add anyone
    """
    
    ROLE_HIERARCHY = {
        'HOKIM': ['HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
        'HOKIM_YORDAMCHISI': ['HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
        'HOKIMLIK_MASUL': [],
        'TASHKILOT_RAHBARI': ['TASHKILOT_MASUL'],
        'TASHKILOT_MASUL': [],
        'ADMIN': ['HOKIM', 'HOKIM_YORDAMCHISI', 'HOKIMLIK_MASUL', 'TASHKILOT_RAHBARI', 'TASHKILOT_MASUL'],
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # GET requests are allowed for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For POST/PUT/DELETE, check role hierarchy
        return request.user.role in self.ROLE_HIERARCHY

    def can_add_role(self, user_role, target_role):
        """
        Check if a user with user_role can add a user with target_role.
        """
        allowed_roles = self.ROLE_HIERARCHY.get(user_role, [])
        return target_role in allowed_roles


class CanManageOrganizations(permissions.BasePermission):
    """
    Permission to manage organizations.
    Only Hokim and Hokimlik mas'uli can manage organizations.
    """
    allowed_roles = ['HOKIM', 'HOKIM_YORDAMCHISI', 'ADMIN']

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return request.user.role in self.allowed_roles


class CanManageBotSettings(permissions.BasePermission):
    """
    Permission to manage Telegram bot and privileged system settings.
    Only admin users can change these settings.
    """
    allowed_roles = ['ADMIN']

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.method in permissions.SAFE_METHODS:
            return request.user.role in self.allowed_roles

        return request.user.role in self.allowed_roles


class CanCreateTasks(permissions.BasePermission):
    """
    Permission to create tasks.
    Hokim, tegishli hokim o'rinbosari va tashkilot rahbari create qila oladi.
    """
    allowed_roles = ['HOKIM', 'HOKIM_YORDAMCHISI', 'TASHKILOT_RAHBARI', 'ADMIN']

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.method in permissions.SAFE_METHODS:
            return True
        
        if request.method == 'POST':
            return request.user.role in self.allowed_roles
        
        return True


class CanExecuteTasks(permissions.BasePermission):
    """
    Permission to execute tasks (accept, report, etc.).
    Tashkilot rahbari and Tashkilot mas'uli can execute tasks.
    """
    allowed_roles = ['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles


class CanCloseTask(permissions.BasePermission):
    """
    Nazoratdan yechish, qayta ijroga qaytarish, muddat uzaytirishni ko'rib
    chiqish. Qoida `tasks/access.py::can_approve_task` da (yagona manba):
    hokim/admin — hammasini; hokim yordamchisi — o'zi yaratgan yoki unga
    biriktirilgan topshiriqni. Frontend'dagi `task.can_approve` ham shu.
    """
    APPROVER_ROLES = ('HOKIM', 'ADMIN', 'HOKIM_YORDAMCHISI')

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in self.APPROVER_ROLES

    def has_object_permission(self, request, view, obj):
        from tasks.access import can_approve_task

        task = getattr(obj, 'task', obj)
        return can_approve_task(request.user, task)


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission for object owners or admins.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        
        # Check if user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        
        return False
