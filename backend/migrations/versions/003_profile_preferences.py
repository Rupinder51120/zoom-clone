"""Persist manually selected workspace profile preferences."""

import sqlalchemy as sa
from alembic import op

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade():
    for name, length, default in [
        ("availability", 20, "Available"),
        ("status_message", 200, ""),
        ("work_location", 20, "Off"),
    ]:
        op.add_column(
            "users",
            sa.Column(name, sa.String(length), nullable=False, server_default=default),
        )


def downgrade():
    with op.batch_alter_table("users") as batch:
        for name in ["availability", "status_message", "work_location"]:
            batch.drop_column(name)
