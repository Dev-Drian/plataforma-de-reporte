"""add share_links table

Revision ID: 007_add_share_links
Revises: 006_soft_delete_mcc
Create Date: 2026-02-05

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_add_share_links'
down_revision = '006_soft_delete_mcc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Crear tabla share_links
    op.create_table(
        'share_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(64), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('account_ids', sa.JSON(), nullable=False),
        sa.Column('platforms', sa.JSON(), nullable=True),
        sa.Column('metrics', sa.JSON(), nullable=True),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('last_accessed', sa.DateTime(timezone=True), nullable=True),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
    )
    
    # Crear índices
    op.create_index('ix_share_links_id', 'share_links', ['id'], unique=False)
    op.create_index('ix_share_links_organization_id', 'share_links', ['organization_id'], unique=False)
    op.create_index('ix_share_links_token', 'share_links', ['token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_share_links_token', table_name='share_links')
    op.drop_index('ix_share_links_organization_id', table_name='share_links')
    op.drop_index('ix_share_links_id', table_name='share_links')
    op.drop_table('share_links')
