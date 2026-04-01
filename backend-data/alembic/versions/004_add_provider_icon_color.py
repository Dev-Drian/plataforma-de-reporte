"""Add icon and color to oauth_providers

Revision ID: 004_provider_icon_color
Revises: 003_oauth_providers
Create Date: 2024-12-17 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_provider_icon_color'
down_revision: Union[str, None] = '003_oauth_providers'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Note: icon and color columns are already created in migration 003
    # This migration just updates existing providers with default values
    
    # Update existing providers with default values
    op.execute("""
        UPDATE oauth_providers 
        SET icon = '🔍', color = 'bg-blue-500' 
        WHERE name = 'google'
    """)
    op.execute("""
        UPDATE oauth_providers 
        SET icon = '📘', color = 'bg-blue-600' 
        WHERE name = 'meta'
    """)
    op.execute("""
        UPDATE oauth_providers 
        SET icon = '💼', color = 'bg-blue-700' 
        WHERE name = 'linkedin'
    """)
    op.execute("""
        UPDATE oauth_providers 
        SET icon = '🎵', color = 'bg-black' 
        WHERE name = 'tiktok'
    """)


def downgrade() -> None:
    # Remove icon and color columns
    op.drop_column('oauth_providers', 'color')
    op.drop_column('oauth_providers', 'icon')

