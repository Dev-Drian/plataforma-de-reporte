"""Add OAuth providers table

Revision ID: 003_oauth_providers
Revises: 002_oauth_configs
Create Date: 2024-01-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_oauth_providers'
down_revision: Union[str, None] = '002_oauth_configs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create oauth_providers table
    op.create_table(
        'oauth_providers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False, unique=True),  # google, meta, linkedin, tiktok
        sa.Column('display_name', sa.String(length=100), nullable=False),  # Google, Meta (Facebook), etc.
        sa.Column('icon', sa.String(length=10), nullable=True),  # Emoji o icono para la plataforma
        sa.Column('color', sa.String(length=50), nullable=True),  # Color CSS para la plataforma
        sa.Column('required_fields', sa.Text(), nullable=False),  # JSON con campos requeridos
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_oauth_providers_id'), 'oauth_providers', ['id'], unique=False)
    op.create_index(op.f('ix_oauth_providers_name'), 'oauth_providers', ['name'], unique=True)
    
    # Add provider_id to oauth_configs table
    op.add_column('oauth_configs', sa.Column('provider_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_oauth_configs_provider_id',
        'oauth_configs',
        'oauth_providers',
        ['provider_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_oauth_configs_provider_id'), 'oauth_configs', ['provider_id'], unique=False)


def downgrade() -> None:
    # Remove provider_id from oauth_configs
    op.drop_index(op.f('ix_oauth_configs_provider_id'), table_name='oauth_configs')
    op.drop_constraint('fk_oauth_configs_provider_id', 'oauth_configs', type_='foreignkey')
    op.drop_column('oauth_configs', 'provider_id')
    
    # Drop oauth_providers table
    op.drop_index(op.f('ix_oauth_providers_name'), table_name='oauth_providers')
    op.drop_index(op.f('ix_oauth_providers_id'), table_name='oauth_providers')
    op.drop_table('oauth_providers')

