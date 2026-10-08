"""Initial users, meetings and participant history schema."""

import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("timezone", sa.String(80), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
    )
    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(11), nullable=False),
        sa.Column(
            "host_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("scheduled_start", sa.String()),
        sa.Column("timezone", sa.String(80), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("host_token_hash", sa.String(64), nullable=False),
        sa.Column("video_on", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("started_at", sa.String()),
        sa.Column("ended_at", sa.String()),
    )
    op.create_index("ix_meetings_code", "meetings", ["code"], unique=True)
    op.create_table(
        "participants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "meeting_id", sa.Integer(), sa.ForeignKey("meetings.id"), nullable=False
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("joined_at", sa.String()),
        sa.Column("left_at", sa.String()),
        sa.Column("removed_at", sa.String()),
    )
    op.create_index("ix_participants_meeting_id", "participants", ["meeting_id"])


def downgrade():
    op.drop_table("participants")
    op.drop_table("meetings")
    op.drop_table("users")
