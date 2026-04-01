"""Initial migration - Create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
# Compatible con MySQL y PostgreSQL
# from sqlalchemy.dialects import postgresql  # No necesario para MySQL

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organizations table
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('plan', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organizations_id'), 'organizations', ['id'], unique=False)
    op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=False)
    op.create_index(op.f('ix_organizations_slug'), 'organizations', ['slug'], unique=True)

    # Roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('permissions', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)

    # User roles table
    op.create_table(
        'user_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role')
    )
    op.create_index(op.f('ix_user_roles_id'), 'user_roles', ['id'], unique=False)
    op.create_index(op.f('ix_user_roles_user_id'), 'user_roles', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_roles_role_id'), 'user_roles', ['role_id'], unique=False)

    # Organization settings table
    op.create_table(
        'organization_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_organization_settings_id'), 'organization_settings', ['id'], unique=False)
    op.create_index(op.f('ix_organization_settings_organization_id'), 'organization_settings', ['organization_id'], unique=False)
    op.create_index(op.f('ix_organization_settings_key'), 'organization_settings', ['key'], unique=False)

    # Keywords table
    op.create_table(
        'keywords',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('keyword', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_keywords_id'), 'keywords', ['id'], unique=False)
    op.create_index(op.f('ix_keywords_organization_id'), 'keywords', ['organization_id'], unique=False)
    op.create_index(op.f('ix_keywords_keyword'), 'keywords', ['keyword'], unique=False)

    # Accounts table
    op.create_table(
        'accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('account_type', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.String(length=255), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('credentials', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('last_sync', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)
    op.create_index(op.f('ix_accounts_organization_id'), 'accounts', ['organization_id'], unique=False)
    op.create_index(op.f('ix_accounts_platform'), 'accounts', ['platform'], unique=False)

    # Cities table
    op.create_table(
        'cities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cities_id'), 'cities', ['id'], unique=False)
    op.create_index(op.f('ix_cities_organization_id'), 'cities', ['organization_id'], unique=False)
    op.create_index(op.f('ix_cities_name'), 'cities', ['name'], unique=False)

    # SEO Metrics table
    op.create_table(
        'seo_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('keyword_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('keyword', sa.String(length=255), nullable=True),
        sa.Column('position', sa.Float(), nullable=True),
        sa.Column('clicks', sa.Integer(), nullable=False),
        sa.Column('impressions', sa.Integer(), nullable=False),
        sa.Column('ctr', sa.Float(), nullable=True),
        sa.Column('url', sa.Text(), nullable=True),
        sa.Column('device', sa.String(length=50), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['keyword_id'], ['keywords.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_seo_metrics_id'), 'seo_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_seo_metrics_organization_id'), 'seo_metrics', ['organization_id'], unique=False)
    op.create_index(op.f('ix_seo_metrics_keyword_id'), 'seo_metrics', ['keyword_id'], unique=False)
    op.create_index(op.f('ix_seo_metrics_date'), 'seo_metrics', ['date'], unique=False)
    op.create_index(op.f('ix_seo_metrics_keyword'), 'seo_metrics', ['keyword'], unique=False)

    # Ads Metrics table
    op.create_table(
        'ads_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('campaign_name', sa.String(length=255), nullable=True),
        sa.Column('campaign_id', sa.String(length=255), nullable=True),
        sa.Column('ad_group_name', sa.String(length=255), nullable=True),
        sa.Column('ad_group_id', sa.String(length=255), nullable=True),
        sa.Column('impressions', sa.Integer(), nullable=False),
        sa.Column('clicks', sa.Integer(), nullable=False),
        sa.Column('conversions', sa.Integer(), nullable=False),
        sa.Column('cost', sa.Float(), nullable=False),
        sa.Column('revenue', sa.Float(), nullable=False),
        sa.Column('ctr', sa.Float(), nullable=True),
        sa.Column('cpc', sa.Float(), nullable=True),
        sa.Column('cpm', sa.Float(), nullable=True),
        sa.Column('roas', sa.Float(), nullable=True),
        sa.Column('conversion_rate', sa.Float(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ads_metrics_id'), 'ads_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_ads_metrics_organization_id'), 'ads_metrics', ['organization_id'], unique=False)
    op.create_index(op.f('ix_ads_metrics_account_id'), 'ads_metrics', ['account_id'], unique=False)
    op.create_index(op.f('ix_ads_metrics_date'), 'ads_metrics', ['date'], unique=False)
    op.create_index(op.f('ix_ads_metrics_platform'), 'ads_metrics', ['platform'], unique=False)

    # Analytics Metrics table
    op.create_table(
        'analytics_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('sessions', sa.Integer(), nullable=False),
        sa.Column('users', sa.Integer(), nullable=False),
        sa.Column('new_users', sa.Integer(), nullable=False),
        sa.Column('pageviews', sa.Integer(), nullable=False),
        sa.Column('bounce_rate', sa.Float(), nullable=True),
        sa.Column('avg_session_duration', sa.Float(), nullable=True),
        sa.Column('conversions', sa.Integer(), nullable=False),
        sa.Column('revenue', sa.Float(), nullable=False),
        sa.Column('device_category', sa.String(length=50), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('source_medium', sa.String(length=255), nullable=True),
        sa.Column('landing_page', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analytics_metrics_id'), 'analytics_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_analytics_metrics_organization_id'), 'analytics_metrics', ['organization_id'], unique=False)
    op.create_index(op.f('ix_analytics_metrics_account_id'), 'analytics_metrics', ['account_id'], unique=False)
    op.create_index(op.f('ix_analytics_metrics_date'), 'analytics_metrics', ['date'], unique=False)

    # GBP Metrics table
    op.create_table(
        'gbp_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('city_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('location_name', sa.String(length=255), nullable=True),
        sa.Column('location_id', sa.String(length=255), nullable=True),
        sa.Column('views_search', sa.Integer(), nullable=False),
        sa.Column('views_maps', sa.Integer(), nullable=False),
        sa.Column('total_views', sa.Integer(), nullable=False),
        sa.Column('actions_website', sa.Integer(), nullable=False),
        sa.Column('actions_directions', sa.Integer(), nullable=False),
        sa.Column('actions_phone', sa.Integer(), nullable=False),
        sa.Column('total_actions', sa.Integer(), nullable=False),
        sa.Column('total_reviews', sa.Integer(), nullable=False),
        sa.Column('average_rating', sa.Float(), nullable=True),
        sa.Column('new_reviews', sa.Integer(), nullable=False),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['city_id'], ['cities.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gbp_metrics_id'), 'gbp_metrics', ['id'], unique=False)
    op.create_index(op.f('ix_gbp_metrics_organization_id'), 'gbp_metrics', ['organization_id'], unique=False)
    op.create_index(op.f('ix_gbp_metrics_account_id'), 'gbp_metrics', ['account_id'], unique=False)
    op.create_index(op.f('ix_gbp_metrics_city_id'), 'gbp_metrics', ['city_id'], unique=False)
    op.create_index(op.f('ix_gbp_metrics_date'), 'gbp_metrics', ['date'], unique=False)

    # Sync Jobs table
    op.create_table(
        'sync_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('job_type', sa.String(length=50), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('date_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('records_synced', sa.Integer(), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sync_jobs_id'), 'sync_jobs', ['id'], unique=False)
    op.create_index(op.f('ix_sync_jobs_organization_id'), 'sync_jobs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_sync_jobs_account_id'), 'sync_jobs', ['account_id'], unique=False)
    op.create_index(op.f('ix_sync_jobs_job_type'), 'sync_jobs', ['job_type'], unique=False)
    op.create_index(op.f('ix_sync_jobs_status'), 'sync_jobs', ['status'], unique=False)

    # Sync Logs table
    op.create_table(
        'sync_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sync_job_id', sa.Integer(), nullable=True),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('level', sa.String(length=20), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sync_job_id'], ['sync_jobs.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sync_logs_id'), 'sync_logs', ['id'], unique=False)
    op.create_index(op.f('ix_sync_logs_sync_job_id'), 'sync_logs', ['sync_job_id'], unique=False)
    op.create_index(op.f('ix_sync_logs_organization_id'), 'sync_logs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_sync_logs_level'), 'sync_logs', ['level'], unique=False)
    op.create_index(op.f('ix_sync_logs_created_at'), 'sync_logs', ['created_at'], unique=False)

    # Alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('is_resolved', sa.Boolean(), nullable=False),
        sa.Column('extra_data', sa.Text(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_id'), 'alerts', ['id'], unique=False)
    op.create_index(op.f('ix_alerts_organization_id'), 'alerts', ['organization_id'], unique=False)
    op.create_index(op.f('ix_alerts_alert_type'), 'alerts', ['alert_type'], unique=False)
    op.create_index(op.f('ix_alerts_is_read'), 'alerts', ['is_read'], unique=False)
    op.create_index(op.f('ix_alerts_is_resolved'), 'alerts', ['is_resolved'], unique=False)
    op.create_index(op.f('ix_alerts_created_at'), 'alerts', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_alerts_created_at'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_is_resolved'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_is_read'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_alert_type'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_organization_id'), table_name='alerts')
    op.drop_index(op.f('ix_alerts_id'), table_name='alerts')
    op.drop_table('alerts')
    
    op.drop_index(op.f('ix_sync_logs_created_at'), table_name='sync_logs')
    op.drop_index(op.f('ix_sync_logs_level'), table_name='sync_logs')
    op.drop_index(op.f('ix_sync_logs_organization_id'), table_name='sync_logs')
    op.drop_index(op.f('ix_sync_logs_sync_job_id'), table_name='sync_logs')
    op.drop_index(op.f('ix_sync_logs_id'), table_name='sync_logs')
    op.drop_table('sync_logs')
    
    op.drop_index(op.f('ix_sync_jobs_status'), table_name='sync_jobs')
    op.drop_index(op.f('ix_sync_jobs_job_type'), table_name='sync_jobs')
    op.drop_index(op.f('ix_sync_jobs_account_id'), table_name='sync_jobs')
    op.drop_index(op.f('ix_sync_jobs_organization_id'), table_name='sync_jobs')
    op.drop_index(op.f('ix_sync_jobs_id'), table_name='sync_jobs')
    op.drop_table('sync_jobs')
    
    op.drop_index(op.f('ix_gbp_metrics_date'), table_name='gbp_metrics')
    op.drop_index(op.f('ix_gbp_metrics_city_id'), table_name='gbp_metrics')
    op.drop_index(op.f('ix_gbp_metrics_account_id'), table_name='gbp_metrics')
    op.drop_index(op.f('ix_gbp_metrics_organization_id'), table_name='gbp_metrics')
    op.drop_index(op.f('ix_gbp_metrics_id'), table_name='gbp_metrics')
    op.drop_table('gbp_metrics')
    
    op.drop_index(op.f('ix_analytics_metrics_date'), table_name='analytics_metrics')
    op.drop_index(op.f('ix_analytics_metrics_account_id'), table_name='analytics_metrics')
    op.drop_index(op.f('ix_analytics_metrics_organization_id'), table_name='analytics_metrics')
    op.drop_index(op.f('ix_analytics_metrics_id'), table_name='analytics_metrics')
    op.drop_table('analytics_metrics')
    
    op.drop_index(op.f('ix_ads_metrics_platform'), table_name='ads_metrics')
    op.drop_index(op.f('ix_ads_metrics_date'), table_name='ads_metrics')
    op.drop_index(op.f('ix_ads_metrics_account_id'), table_name='ads_metrics')
    op.drop_index(op.f('ix_ads_metrics_organization_id'), table_name='ads_metrics')
    op.drop_index(op.f('ix_ads_metrics_id'), table_name='ads_metrics')
    op.drop_table('ads_metrics')
    
    op.drop_index(op.f('ix_seo_metrics_keyword'), table_name='seo_metrics')
    op.drop_index(op.f('ix_seo_metrics_date'), table_name='seo_metrics')
    op.drop_index(op.f('ix_seo_metrics_keyword_id'), table_name='seo_metrics')
    op.drop_index(op.f('ix_seo_metrics_organization_id'), table_name='seo_metrics')
    op.drop_index(op.f('ix_seo_metrics_id'), table_name='seo_metrics')
    op.drop_table('seo_metrics')
    
    op.drop_index(op.f('ix_cities_name'), table_name='cities')
    op.drop_index(op.f('ix_cities_organization_id'), table_name='cities')
    op.drop_index(op.f('ix_cities_id'), table_name='cities')
    op.drop_table('cities')
    
    op.drop_index(op.f('ix_accounts_platform'), table_name='accounts')
    op.drop_index(op.f('ix_accounts_organization_id'), table_name='accounts')
    op.drop_index(op.f('ix_accounts_id'), table_name='accounts')
    op.drop_table('accounts')
    
    op.drop_index(op.f('ix_keywords_keyword'), table_name='keywords')
    op.drop_index(op.f('ix_keywords_organization_id'), table_name='keywords')
    op.drop_index(op.f('ix_keywords_id'), table_name='keywords')
    op.drop_table('keywords')
    
    op.drop_index(op.f('ix_organization_settings_key'), table_name='organization_settings')
    op.drop_index(op.f('ix_organization_settings_organization_id'), table_name='organization_settings')
    op.drop_index(op.f('ix_organization_settings_id'), table_name='organization_settings')
    op.drop_table('organization_settings')
    
    op.drop_index(op.f('ix_user_roles_role_id'), table_name='user_roles')
    op.drop_index(op.f('ix_user_roles_user_id'), table_name='user_roles')
    op.drop_index(op.f('ix_user_roles_id'), table_name='user_roles')
    op.drop_table('user_roles')
    
    op.drop_index(op.f('ix_users_organization_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    
    op.drop_index(op.f('ix_roles_name'), table_name='roles')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
    
    op.drop_index(op.f('ix_organizations_slug'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_name'), table_name='organizations')
    op.drop_index(op.f('ix_organizations_id'), table_name='organizations')
    op.drop_table('organizations')

