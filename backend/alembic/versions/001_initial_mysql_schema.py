"""Initial MySQL 8.x Schema for City-Wide ANPR Platform

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-09 23:36:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('badge_number', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('role', sa.String(64), default='Government Operator'),
        sa.Column('department', sa.String(128), default='Bangalore Traffic Police Command & Control (TMC)'),
        sa.Column('shift', sa.String(64), default='Surveillance Desk 24/7'),
        sa.Column('avatar', sa.String(512), nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=True)
    )

    # 2. Cameras table
    op.create_table(
        'cameras',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('code', sa.String(64), unique=True, index=True, nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('zone', sa.String(64), nullable=False),
        sa.Column('status', sa.String(32), default='ONLINE', index=True),
        sa.Column('camera_type', sa.String(64), default='ANPR Traffic Camera'),
        sa.Column('ai_modules', sa.JSON(), nullable=True),
        sa.Column('vehicles_per_min', sa.Integer(), default=40),
        sa.Column('traffic_level', sa.String(32), default='Normal'),
        sa.Column('last_detected_plate', sa.String(32), nullable=True),
        sa.Column('violations_today', sa.Integer(), default=0),
        sa.Column('vehicles_today', sa.Integer(), default=0),
        sa.Column('avg_speed', sa.Float(), default=35.0),
        sa.Column('uptime', sa.Float(), default=99.5),
        sa.Column('direction', sa.String(64), default='Northbound'),
        sa.Column('stream_url', sa.String(512), nullable=True),
        sa.Column('resolution', sa.String(64), default='1080p'),
        sa.Column('fps', sa.Integer(), default=30),
        sa.Column('ip_address', sa.String(64), default='192.168.1.100'),
        sa.Column('install_date', sa.String(64), nullable=True)
    )

    # 3. Vehicles table
    op.create_table(
        'vehicles',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('plate', sa.String(32), unique=True, index=True, nullable=False),
        sa.Column('type', sa.String(64), default='Car', index=True),
        sa.Column('make_model', sa.String(128), default='Standard Vehicle'),
        sa.Column('color', sa.String(64), default='White'),
        sa.Column('first_seen', sa.String(64), nullable=True),
        sa.Column('last_seen', sa.String(64), nullable=True, index=True),
        sa.Column('sightings_count', sa.Integer(), default=1),
        sa.Column('violations_count', sa.Integer(), default=0),
        sa.Column('is_watchlisted', sa.Boolean(), default=False, index=True),
        sa.Column('watchlist_reason', sa.String(255), nullable=True),
        sa.Column('risk_level', sa.String(32), default='Low'),
        sa.Column('registered_owner', sa.String(128), nullable=True),
        sa.Column('registered_state', sa.String(64), nullable=True),
        sa.Column('fuel_type', sa.String(32), default='Petrol')
    )

    # 4. Watchlist table
    op.create_table(
        'watchlist',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('plate', sa.String(32), index=True, nullable=False),
        sa.Column('vehicle_type', sa.String(64), default='Car'),
        sa.Column('color', sa.String(64), default='White'),
        sa.Column('reason', sa.String(255), nullable=False),
        sa.Column('priority', sa.String(32), default='High'),
        sa.Column('added_date', sa.String(64), nullable=True),
        sa.Column('added_by', sa.String(64), default='Operator'),
        sa.Column('notes', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, index=True),
        sa.Column('flagged_sightings', sa.Integer(), default=0)
    )

    # 5. Detections table (Permanent Historical Ledger)
    op.create_table(
        'detections',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('vehicle_id', sa.String(64), sa.ForeignKey('vehicles.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('plate', sa.String(32), nullable=False, index=True),
        sa.Column('camera_code', sa.String(64), sa.ForeignKey('cameras.code', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('camera_name', sa.String(128), nullable=False),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('timestamp', sa.String(64), nullable=False, index=True),
        sa.Column('direction', sa.String(64), default='Inbound'),
        sa.Column('speed', sa.Float(), default=45.0),
        sa.Column('confidence', sa.Float(), default=98.0, index=True),
        sa.Column('vehicle_type', sa.String(64), default='Car', index=True),
        sa.Column('vehicle_color', sa.String(64), default='White'),
        sa.Column('lane_number', sa.Integer(), default=1),
        sa.Column('bbox_vehicle', sa.JSON(), nullable=True),
        sa.Column('bbox_plate', sa.JSON(), nullable=True),
        sa.Column('violation_id', sa.String(64), nullable=True),
        sa.Column('re_id_score', sa.Float(), default=95.0),
        sa.Column('snapshot_url', sa.String(512), nullable=True),
        sa.Column('plate_crop_url', sa.String(512), nullable=True)
    )
    op.create_index('ix_detections_cam_time', 'detections', ['camera_code', 'timestamp'])
    op.create_index('ix_detections_plate_time', 'detections', ['plate', 'timestamp'])
    op.create_index('ix_detections_veh_time', 'detections', ['vehicle_id', 'timestamp'])

    # 6. Alerts table
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('detection_id', sa.String(64), sa.ForeignKey('detections.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('title', sa.String(128), nullable=False),
        sa.Column('type', sa.String(32), default='Critical', index=True),
        sa.Column('category', sa.String(32), default='WATCHLIST', index=True),
        sa.Column('vehicle_plate', sa.String(32), nullable=True, index=True),
        sa.Column('camera_code', sa.String(64), nullable=True, index=True),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('timestamp', sa.String(64), nullable=False, index=True),
        sa.Column('description', sa.String(512), nullable=False),
        sa.Column('status', sa.String(32), default='ACTIVE', index=True),
        sa.Column('action_required', sa.String(255), nullable=True)
    )

    # 7. Violations table
    op.create_table(
        'violations',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('plate', sa.String(32), nullable=False, index=True),
        sa.Column('type', sa.String(64), nullable=False, index=True),
        sa.Column('camera_code', sa.String(64), nullable=False, index=True),
        sa.Column('location', sa.String(255), nullable=False),
        sa.Column('timestamp', sa.String(64), nullable=False, index=True),
        sa.Column('speed_recorded', sa.Float(), nullable=True),
        sa.Column('speed_limit', sa.Float(), nullable=True),
        sa.Column('fine_amount', sa.Float(), default=1000.0),
        sa.Column('status', sa.String(32), default='PENDING', index=True),
        sa.Column('evidence_image_url', sa.String(512), nullable=True),
        sa.Column('challan_id', sa.String(64), unique=True, index=True, nullable=True)
    )

    # 8. Audit logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(64), primary_key=True, index=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('action', sa.String(64), nullable=False, index=True),
        sa.Column('entity_type', sa.String(64), nullable=True, index=True),
        sa.Column('entity_id', sa.String(64), nullable=True, index=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True)
    )

def downgrade() -> None:
    op.drop_table('audit_logs')
    op.drop_table('violations')
    op.drop_table('alerts')
    op.drop_table('detections')
    op.drop_table('watchlist')
    op.drop_table('vehicles')
    op.drop_table('cameras')
    op.drop_table('users')
