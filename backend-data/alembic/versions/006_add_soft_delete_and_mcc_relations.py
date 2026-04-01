"""Add soft delete and MCC relations to accounts

Revision ID: 006_soft_delete_mcc
Revises: 005_developer_token
Create Date: 2024-12-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_soft_delete_mcc'
down_revision: Union[str, None] = '005_developer_token'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add deleted_at column for soft delete
    op.add_column('accounts', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_accounts_deleted_at'), 'accounts', ['deleted_at'], unique=False)
    
    # Add parent_account_id column for MCC relationships
    op.add_column('accounts', sa.Column('parent_account_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_accounts_parent_account_id'), 'accounts', ['parent_account_id'], unique=False)
    op.create_foreign_key(
        'fk_accounts_parent_account_id',
        'accounts', 'accounts',
        ['parent_account_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Remove foreign key and index for parent_account_id
    op.drop_constraint('fk_accounts_parent_account_id', 'accounts', type_='foreignkey')
    op.drop_index(op.f('ix_accounts_parent_account_id'), table_name='accounts')
    op.drop_column('accounts', 'parent_account_id')
    
    # Remove index and column for deleted_at
    op.drop_index(op.f('ix_accounts_deleted_at'), table_name='accounts')
    op.drop_column('accounts', 'deleted_at')



