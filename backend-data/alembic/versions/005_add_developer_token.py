"""Add developer_token to oauth_configs

Revision ID: 005_developer_token
Revises: 004_provider_icon_color
Create Date: 2024-12-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_developer_token'
down_revision: Union[str, None] = '004_provider_icon_color'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add developer_token column to oauth_configs
    op.add_column('oauth_configs', sa.Column('developer_token', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove developer_token column
    op.drop_column('oauth_configs', 'developer_token')





