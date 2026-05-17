import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coordinate } from '../types';
import { calculateSegmentSpeeds, normalizeSpeed, speedToColor } from '../utils/calculations';
import { COLORS } from '../constants/colors';

interface Props {
  coordinates: Coordinate[];
  width: number;
  height: number;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

const PADDING = 20;

export function RouteMapView({ coordinates, width, height }: Props) {
  const { segments, startDot, endDot } = useMemo(() => {
    if (coordinates.length < 2) return { segments: [], startDot: null, endDot: null };

    const lats = coordinates.map((c) => c.latitude);
    const lngs = coordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;

    const drawW = width - PADDING * 2;
    const drawH = height - PADDING * 2;

    // Maintain aspect ratio
    const latScale = drawH / latRange;
    const lngScale = drawW / lngRange;
    const scale = Math.min(latScale, lngScale);

    const actualW = lngRange * scale;
    const actualH = latRange * scale;
    const offsetX = PADDING + (drawW - actualW) / 2;
    const offsetY = PADDING + (drawH - actualH) / 2;

    const toX = (lng: number) => offsetX + (lng - minLng) * scale;
    // latitude increases upward on map, but screen Y increases downward
    const toY = (lat: number) => offsetY + (maxLat - lat) * scale;

    const speeds = calculateSegmentSpeeds(coordinates);
    const validSpeeds = speeds.filter((s) => s > 0);
    const minSpeed = validSpeeds.length > 0 ? Math.min(...validSpeeds) : 0;
    const maxSpeed = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 0;

    const segs: Segment[] = [];
    for (let i = 1; i < coordinates.length; i++) {
      const x1 = toX(coordinates[i - 1].longitude);
      const y1 = toY(coordinates[i - 1].latitude);
      const x2 = toX(coordinates[i].longitude);
      const y2 = toY(coordinates[i].latitude);
      const speed = speeds[i - 1] ?? 0;
      const norm = normalizeSpeed(speed, minSpeed, maxSpeed);
      segs.push({ x1, y1, x2, y2, color: speedToColor(norm) });
    }

    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    return {
      segments: segs,
      startDot: { x: toX(first.longitude), y: toY(first.latitude) },
      endDot: { x: toX(last.longitude), y: toY(last.latitude) },
    };
  }, [coordinates, width, height]);

  if (coordinates.length < 2) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>GPS 데이터 없음</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Route segments */}
      {segments.map((seg, i) => {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.5) return null;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const cx = (seg.x1 + seg.x2) / 2;
        const cy = (seg.y1 + seg.y2) / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: cx - length / 2,
              top: cy - 2.5,
              width: length,
              height: 5,
              backgroundColor: seg.color,
              borderRadius: 2.5,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {/* Start dot (green) */}
      {startDot && (
        <View
          style={[
            styles.markerOuter,
            { left: startDot.x - 8, top: startDot.y - 8, backgroundColor: 'rgba(6,214,160,0.3)' },
          ]}
        >
          <View style={[styles.markerInner, { backgroundColor: '#06D6A0' }]} />
        </View>
      )}

      {/* End dot (orange) */}
      {endDot && (
        <View
          style={[
            styles.markerOuter,
            { left: endDot.x - 8, top: endDot.y - 8, backgroundColor: 'rgba(255,123,79,0.3)' },
          ]}
        >
          <View style={[styles.markerInner, { backgroundColor: COLORS.sunsetOrange }]} />
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>느림</Text>
        </View>
        <View style={styles.legendGradient}>
          {Array.from({ length: 10 }, (_, i) => (
            <View
              key={i}
              style={[styles.legendBar, { backgroundColor: speedToColor(i / 9) }]}
            />
          ))}
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>빠름</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0E24',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  empty: {
    backgroundColor: '#0A0E24',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  markerOuter: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legend: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(8,12,30,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  legendGradient: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: 40,
  },
  legendBar: {
    flex: 1,
    height: 6,
  },
});
