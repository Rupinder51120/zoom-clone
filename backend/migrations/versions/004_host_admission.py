"""Bind pending host admissions to the current host credential."""

import sqlalchemy as sa
from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("participants", sa.Column("host_admission_hash", sa.String(64)))


def downgrade():
    with op.batch_alter_table("participants") as batch:
        batch.drop_column("host_admission_hash")
