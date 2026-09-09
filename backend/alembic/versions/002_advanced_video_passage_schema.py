"""Advanced Video Processing and Vehicle Passages Schema

Revision ID: 002_video_passages
Revises: 001_initial_schema
Create Date: 2026-09-10 00:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_video_passages'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Videos table
    op.create_table(
        'videos',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), default=0),
        sa.Column('duration_seconds', sa.Float(), default=0.0),
        sa.Column('fps', sa.Float(), default=30.0),
        sa.Column('resolution', sa.String(64), default='1080p'),
        sa.Column('frame_count', sa.Integer(), default=0),
        sa.Column('codec', sa.String(32), default='H.264'),
        sa.Column('camera_code', sa.String(64), nullable=True, index=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('status', sa.String(32), default='QUEUED', index=True),
        sa.Column('progress_percentage', sa.Float(), default=0.0),
        sa.Column('processed_frames', sa.Integer(), default=0),
        sa.Column('total_vehicles', sa.Integer(), default=0),
        sa.Column('unique_vehicles', sa.Integer(), default=0),
        sa.Column('plates_recognized', sa.Integer(), default=0),
        sa.Column('plates_unreadable', sa.Integer(), default=0),
        sa.Column('compliant_vehicles', sa.Integer(), default=0),
        sa.Column('violating_vehicles', sa.Integer(), default=0),
        sa.Column('review_required', sa.Integer(), default=0),
        sa.Column('total_violations', sa.Integer(), default=0),
        sa.Column('processing_start', sa.DateTime(), nullable=True),
        sa.Column('processing_end', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.String(512), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True)
    )

    # 2. Vehicle Passages table
    op.create_table(
        'vehicle_passages',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('video_id', sa.String(64), sa.ForeignKey('videos.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('track_id', sa.Integer(), nullable=False, index=True),
        sa.Column('camera_code', sa.String(64), sa.ForeignKey('cameras.code', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('vehicle_id', sa.String(64), sa.ForeignKey('vehicles.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('plate_number', sa.String(32), nullable=False, index=True),
        sa.Column('plate_country', sa.String(64), default='UNKNOWN', index=True),
        sa.Column('plate_format', sa.String(64), default='Universal Alphanumeric'),
        sa.Column('recognition_status', sa.String(32), default='RECOGNIZED', index=True),
        sa.Column('compliance_status', sa.String(32), default='COMPLIANT', index=True),
        sa.Column('vehicle_type', sa.String(64), default='Car', index=True),
        sa.Column('vehicle_color', sa.String(64), default='Unknown'),
        sa.Column('make', sa.String(64), default='Unknown'),
        sa.Column('model', sa.String(64), default='Unknown'),
        sa.Column('first_seen_timestamp', sa.String(64), nullable=False, index=True),
        sa.Column('last_seen_timestamp', sa.String(64), nullable=False),
        sa.Column('duration_seconds', sa.Float(), default=0.0),
        sa.Column('avg_speed', sa.Float(), default=45.0),
        sa.Column('max_speed', sa.Float(), default=45.0),
        sa.Column('direction', sa.String(64), default='Inbound'),
        sa.Column('lane_number', sa.Integer(), default=1),
        sa.Column('vehicle_confidence', sa.Float(), default=95.0),
        sa.Column('plate_confidence', sa.Float(), default=90.0),
        sa.Column('ocr_confidence', sa.Float(), default=90.0),
        sa.Column('final_confidence', sa.Float(), default=92.0),
        sa.Column('best_vehicle_image_path', sa.String(512), nullable=True),
        sa.Column('best_plate_image_path', sa.String(512), nullable=True),
        sa.Column('raw_ocr_observations', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True)
    )
    op.create_index('ix_passages_video_track', 'vehicle_passages', ['video_id', 'track_id'])
    op.create_index('ix_passages_plate_time', 'vehicle_passages', ['plate_number', 'first_seen_timestamp'])
    op.create_index('ix_passages_compliance', 'vehicle_passages', ['compliance_status', 'created_at'])
    op.create_index('ix_passages_cam_time', 'vehicle_passages', ['camera_code', 'first_seen_timestamp'])

def downgrade() -> None:
    op.drop_table('vehicle_passages')
    op.drop_table('videos')
