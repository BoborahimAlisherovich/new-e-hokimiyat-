"""
Analytics views for E-Hokimiyat API.
"""

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.db.models import Count, Q, Avg, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from io import BytesIO

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from tasks.models import Task, TaskOrganization
from organizations.models import Organization
from users.models import User


class IsHokimOrHokimlikMasul:
    """Permission for viewing analytics."""
    def has_permission(self, request, view):
        return request.user.role in ['HOKIM', 'HOKIMLIK_MASUL', 'ADMIN']


class DashboardAnalyticsView(views.APIView):
    """
    Dashboard analytics endpoint.
    
    GET /api/analytics/dashboard/
    """
    permission_classes = [IsAuthenticated, IsHokimOrHokimlikMasul]
    
    def get(self, request):
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        
        # Task statistics - yangi talablar bo'yicha
        total_tasks = Task.objects.count()
        new_tasks = Task.objects.filter(status='YANGI').count()  # Kelib tushgan murjaatlar
        in_progress_tasks = Task.objects.filter(status='IJRODA').count()  # Jarayondagi topshiriqlar
        completed_tasks = Task.objects.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count()  # Bajarilgan topshiriqlar
        
        # Yangi statuslar statistikasi
        pending_approval = Task.objects.filter(status='YANGI').count()  # Tasdiqlanishdagi topshiriqlar
        resubmitted = Task.objects.filter(status='QAYTA_IJROGA_YUBORILDI').count()  # Qayta ijroga yuborilgan
        overdue_tasks = Task.objects.filter(status='MUDDATI_KECH').count()  # Kechikkan topshiriqlar
        
        # Yaratilgan topshiriqlar soni (oxirgi 30 kun)
        created_recently = Task.objects.filter(
            created_at__date__gte=thirty_days_ago
        ).count()
        
        # Tasks by priority
        tasks_by_priority = Task.objects.values('priority').annotate(count=Count('id'))
        
        # User statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(status='FAOL').count()
        
        # Organization statistics
        total_organizations = Organization.objects.filter(is_active=True).count()
        
        # Recent activity (last 30 days)
        tasks_trend = Task.objects.filter(
            created_at__date__gte=thirty_days_ago
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            created=Count('id')
        ).order_by('date')
        
        completed_trend = Task.objects.filter(
            closed_at__date__gte=thirty_days_ago
        ).annotate(
            date=TruncDate('closed_at')
        ).values('date').annotate(
            completed=Count('id')
        ).order_by('date')
        
        return Response({
            'summary': {
                'total_tasks': total_tasks,
                'new_tasks': new_tasks,  # Kelib tushgan murjaatlar
                'in_progress_tasks': in_progress_tasks,  # Jarayondagi topshiriqlar
                'completed_tasks': completed_tasks,  # Bajarilgan topshiriqlar
                'created_recently': created_recently,  # Yaratilgan topshiriqlar soni
                'pending_approval': pending_approval,  # Tasdiqlanishdagi topshiriqlar
                'resubmitted': resubmitted,  # Qayta ijroga yuborilgan
                'overdue_tasks': overdue_tasks,  # Kechikkan topshiriqlar
                'total_users': total_users,
                'active_users': active_users,
                'total_organizations': total_organizations,
            },
            'tasks_by_priority': list(tasks_by_priority),
            'tasks_trend': list(tasks_trend),
            'completed_trend': list(completed_trend),
        })


class OrganizationAnalyticsView(views.APIView):
    """
    Organization analytics endpoint.
    
    GET /api/analytics/organizations/
    """
    permission_classes = [IsAuthenticated, IsHokimOrHokimlikMasul]
    
    def get(self, request):
        organizations = Organization.objects.filter(is_active=True)
        
        org_stats = []
        for org in organizations:
            task_orgs = TaskOrganization.objects.filter(organization=org)
            
            total = task_orgs.count()
            completed = task_orgs.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count()
            overdue = task_orgs.filter(status='MUDDATI_KECH').count()
            in_progress = task_orgs.filter(status='IJRODA').count()
            
            # Calculate completion rate
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            # Calculate rating (simple formula: completion rate - overdue penalty)
            rating = max(0, completion_rate - (overdue / total * 50) if total > 0 else 0)
            
            org_stats.append({
                'organization': {
                    'id': str(org.id),
                    'name': org.name,
                    'short_name': org.short_name,
                },
                'total_tasks': total,
                'completed_tasks': completed,
                'in_progress_tasks': in_progress,
                'overdue_tasks': overdue,
                'completion_rate': round(completion_rate, 1),
                'rating': round(rating, 1),
            })
        
        # Sort by rating descending and return only TOP 5
        org_stats.sort(key=lambda x: x['rating'], reverse=True)
        top_5_orgs = org_stats[:5]  # Faqat eng yaxshi 5 tashkilot
        
        return Response(top_5_orgs)


class UserAnalyticsView(views.APIView):
    """
    User analytics endpoint.
    
    GET /api/analytics/users/
    """
    permission_classes = [IsAuthenticated, IsHokimOrHokimlikMasul]
    
    def get(self, request):
        # Users by role
        users_by_role = User.objects.filter(
            status='FAOL'
        ).values('role').annotate(count=Count('id'))
        
        # Users by status
        users_by_status = User.objects.values('status').annotate(count=Count('id'))
        
        # Top performers (most completed tasks)
        top_performers = User.objects.filter(
            status='FAOL',
            role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
        ).annotate(
            completed_tasks=Count(
                'assigned_tasks',
                filter=Q(assigned_tasks__status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI'])
            )
        ).order_by('-completed_tasks')[:10]
        
        return Response({
            'users_by_role': list(users_by_role),
            'users_by_status': list(users_by_status),
            'top_performers': [
                {
                    'id': str(u.id),
                    'name': u.full_name,
                    'role': u.role,
                    'organization': u.organization.name if u.organization else None,
                    'completed_tasks': u.completed_tasks,
                }
                for u in top_performers
            ],
        })


class TaskTrendsView(views.APIView):
    """
    Task trends analytics endpoint.
    
    GET /api/analytics/trends/
    """
    permission_classes = [IsAuthenticated, IsHokimOrHokimlikMasul]
    
    def get(self, request):
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        # Tasks created per day
        created_trend = Task.objects.filter(
            created_at__date__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        # Tasks by status over time
        status_distribution = Task.objects.values('status').annotate(count=Count('id'))
        
        # Average completion time
        completed_tasks = Task.objects.filter(
            closed_at__isnull=False
        ).annotate(
            completion_time=F('closed_at') - F('created_at')
        )
        
        avg_completion_days = 0
        if completed_tasks.exists():
            total_days = sum(
                (t.completion_time.total_seconds() / 86400) 
                for t in completed_tasks 
                if t.completion_time
            )
            avg_completion_days = total_days / completed_tasks.count()
        
        return Response({
            'created_trend': list(created_trend),
            'status_distribution': list(status_distribution),
            'average_completion_days': round(avg_completion_days, 1),
        })


class AnalyticsExportView(views.APIView):
    """
    Analytics export endpoint.
    
    GET /api/analytics/export/?format=xlsx|pdf
    """
    permission_classes = [IsAuthenticated, IsHokimOrHokimlikMasul]

    def get(self, request):
        export_format = request.query_params.get('format', 'xlsx').lower()

        data = self._collect_data()

        if export_format == 'pdf':
            return self._export_pdf(data)

        return self._export_xlsx(data)

    def _collect_data(self):
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)

        tasks = Task.objects.all()

        summary = {
            'total_tasks': tasks.count(),
            'new_tasks': tasks.filter(status='YANGI').count(),
            'in_progress_tasks': tasks.filter(status='IJRODA').count(),
            'completed_tasks': tasks.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count(),
            'pending_approval': tasks.filter(status='YANGI').count(),
            'resubmitted': tasks.filter(status='QAYTA_IJROGA_YUBORILDI').count(),
            'overdue_tasks': tasks.filter(status='MUDDATI_KECH').count(),
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(status='FAOL').count(),
            'total_organizations': Organization.objects.filter(is_active=True).count(),
        }

        tasks_by_priority = list(
            tasks.values('priority').annotate(count=Count('id')).order_by('priority')
        )

        tasks_trend = list(
            tasks.filter(created_at__date__gte=thirty_days_ago)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(created=Count('id'))
            .order_by('date')
        )

        completed_trend = list(
            tasks.filter(closed_at__date__gte=thirty_days_ago)
            .annotate(date=TruncDate('closed_at'))
            .values('date')
            .annotate(completed=Count('id'))
            .order_by('date')
        )

        organizations = Organization.objects.filter(is_active=True)
        org_stats = []
        for org in organizations:
            task_orgs = TaskOrganization.objects.filter(organization=org)
            total = task_orgs.count()
            completed = task_orgs.filter(status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI']).count()
            overdue = task_orgs.filter(status='MUDDATI_KECH').count()
            in_progress = task_orgs.filter(status='IJRODA').count()
            completion_rate = (completed / total * 100) if total > 0 else 0
            rating = max(0, completion_rate - (overdue / total * 50) if total > 0 else 0)

            org_stats.append({
                'name': org.name,
                'total_tasks': total,
                'completed_tasks': completed,
                'in_progress_tasks': in_progress,
                'overdue_tasks': overdue,
                'completion_rate': round(completion_rate, 1),
                'rating': round(rating, 1),
            })

        users_by_role = list(User.objects.filter(status='FAOL').values('role').annotate(count=Count('id')))
        users_by_status = list(User.objects.values('status').annotate(count=Count('id')))
        top_performers = list(
            User.objects.filter(
                status='FAOL',
                role__in=['TASHKILOT_RAHBARI', 'TASHKILOT_MASUL']
            )
            .annotate(
                completed_tasks=Count(
                    'assigned_tasks',
                    filter=Q(assigned_tasks__status__in=['BAJARILDI', 'NAZORATDAN_YECHILDI'])
                )
            )
            .order_by('-completed_tasks')
            .values('full_name', 'role', 'completed_tasks')[:10]
        )

        return {
            'summary': summary,
            'tasks_by_priority': tasks_by_priority,
            'tasks_trend': tasks_trend,
            'completed_trend': completed_trend,
            'org_stats': org_stats,
            'users_by_role': users_by_role,
            'users_by_status': users_by_status,
            'top_performers': top_performers,
        }

    def _export_xlsx(self, data: dict):
        wb = Workbook()

        # Summary sheet
        ws = wb.active
        ws.title = 'Summary'
        ws.append(['Metric', 'Value'])
        for key, value in data['summary'].items():
            ws.append([key, value])

        # Tasks by priority
        ws_priority = wb.create_sheet('Tasks Priority')
        ws_priority.append(['Priority', 'Count'])
        for row in data['tasks_by_priority']:
            ws_priority.append([row['priority'], row['count']])
        if len(data['tasks_by_priority']) > 0:
            chart = BarChart()
            chart.title = 'Tasks by Priority'
            data_ref = Reference(ws_priority, min_col=2, min_row=1, max_row=ws_priority.max_row)
            cats_ref = Reference(ws_priority, min_col=1, min_row=2, max_row=ws_priority.max_row)
            chart.add_data(data_ref, titles_from_data=True)
            chart.set_categories(cats_ref)
            ws_priority.add_chart(chart, 'D2')

        # Trends sheet
        ws_trends = wb.create_sheet('Trends')
        ws_trends.append(['Date', 'Created', 'Completed'])
        completed_map = {row['date']: row['completed'] for row in data['completed_trend']}
        for row in data['tasks_trend']:
            ws_trends.append([row['date'], row['created'], completed_map.get(row['date'], 0)])
        if ws_trends.max_row > 2:
            line_chart = LineChart()
            line_chart.title = 'Tasks Trend (Last 30 days)'
            data_ref = Reference(ws_trends, min_col=2, min_row=1, max_col=3, max_row=ws_trends.max_row)
            cats_ref = Reference(ws_trends, min_col=1, min_row=2, max_row=ws_trends.max_row)
            line_chart.add_data(data_ref, titles_from_data=True)
            line_chart.set_categories(cats_ref)
            ws_trends.add_chart(line_chart, 'E2')

        # Organizations sheet
        ws_org = wb.create_sheet('Organizations')
        ws_org.append([
            'Organization', 'Total', 'Completed', 'In Progress', 'Overdue', 'Completion Rate', 'Rating'
        ])
        for row in data['org_stats']:
            ws_org.append([
                row['name'], row['total_tasks'], row['completed_tasks'], row['in_progress_tasks'],
                row['overdue_tasks'], row['completion_rate'], row['rating']
            ])
        if ws_org.max_row > 2:
            bar_chart = BarChart()
            bar_chart.title = 'Organization Ratings'
            data_ref = Reference(ws_org, min_col=7, min_row=1, max_row=ws_org.max_row)
            cats_ref = Reference(ws_org, min_col=1, min_row=2, max_row=ws_org.max_row)
            bar_chart.add_data(data_ref, titles_from_data=True)
            bar_chart.set_categories(cats_ref)
            ws_org.add_chart(bar_chart, 'I2')

        # Users sheet
        ws_users = wb.create_sheet('Users')
        ws_users.append(['Role', 'Count'])
        for row in data['users_by_role']:
            ws_users.append([row['role'], row['count']])
        ws_users.append([])
        ws_users.append(['Status', 'Count'])
        for row in data['users_by_status']:
            ws_users.append([row['status'], row['count']])
        ws_users.append([])
        ws_users.append(['Top Performer', 'Role', 'Completed Tasks'])
        for row in data['top_performers']:
            ws_users.append([row['full_name'], row['role'], row['completed_tasks']])

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="analytics_export.xlsx"'
        return response

    def _export_pdf(self, data: dict):
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        pdf.setFont('Helvetica-Bold', 14)
        pdf.drawString(40, height - 40, 'Analytics Report')

        pdf.setFont('Helvetica', 10)
        y = height - 70

        pdf.drawString(40, y, 'Summary')
        y -= 16
        for key, value in data['summary'].items():
            pdf.drawString(50, y, f"{key}: {value}")
            y -= 12
            if y < 80:
                pdf.showPage()
                pdf.setFont('Helvetica', 10)
                y = height - 40

        pdf.showPage()
        pdf.save()

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="analytics_report.pdf"'
        return response
