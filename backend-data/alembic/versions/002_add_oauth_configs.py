"""Add OAuth configs and update accounts for OAuth

Revision ID: 002_oauth_configs
Revises: 001_initial
Create Date: 2024-01-15 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_oauth_configs'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create oauth_configs table
    op.create_table(
        'oauth_configs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('platform', sa.String(length=50), nullable=False),
        sa.Column('client_id', sa.String(length=500), nullable=False),
        sa.Column('client_secret', sa.String(length=500), nullable=False),
        sa.Column('redirect_uri', sa.String(length=500), nullable=True),
        sa.Column('scopes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id', 'platform', name='uq_org_platform_oauth')
    )
    op.create_index(op.f('ix_oauth_configs_id'), 'oauth_configs', ['id'], unique=False)
    op.create_index(op.f('ix_oauth_configs_organization_id'), 'oauth_configs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_oauth_configs_platform'), 'oauth_configs', ['platform'], unique=False)

    # Update accounts table - Add new OAuth fields
    op.add_column('accounts', sa.Column('user_email', sa.String(length=255), nullable=True))
    op.add_column('accounts', sa.Column('access_token', sa.Text(), nullable=True))
    op.add_column('accounts', sa.Column('refresh_token', sa.Text(), nullable=True))
    op.add_column('accounts', sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('accounts', sa.Column('last_sync_status', sa.String(length=50), nullable=True))
    op.add_column('accounts', sa.Column('last_sync_error', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove new columns from accounts
    op.drop_column('accounts', 'last_sync_error')
    op.drop_column('accounts', 'last_sync_status')
    op.drop_column('accounts', 'token_expires_at')
    op.drop_column('accounts', 'refresh_token')
    op.drop_column('accounts', 'access_token')
    op.drop_column('accounts', 'user_email')

    # Drop oauth_configs table
    op.drop_index(op.f('ix_oauth_configs_platform'), table_name='oauth_configs')
    op.drop_index(op.f('ix_oauth_configs_organization_id'), table_name='oauth_configs')
    op.drop_index(op.f('ix_oauth_configs_id'), table_name='oauth_configs')
    op.drop_table('oauth_configs')


