import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card, Chip, IconButton } from 'react-native-paper';
import * as Location from 'expo-location';

import { theme } from '../../styles/theme';

interface Facility {
  id: string;
  name: string;
  type: string;
  distance: number; // in meters
  isOpen: boolean;
  openingHours: string;
  icon: string;
}

export function NearbyFacilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (location) {
      loadNearbyFacilities();
    }
  }, [location]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadNearbyFacilities = () => {
    // Mock data - in real app, this would be an API call
    const mockFacilities: Facility[] = [
      {
        id: '1',
        name: 'Central Library',
        type: 'library',
        distance: 120,
        isOpen: true,
        openingHours: '8:00 AM - 10:00 PM',
        icon: 'book-open',
      },
      {
        id: '2',
        name: 'Chemistry Lab A',
        type: 'laboratory',
        distance: 340,
        isOpen: true,
        openingHours: '9:00 AM - 5:00 PM',
        icon: 'flask',
      },
      {
        id: '3',
        name: 'Student Cafeteria',
        type: 'cafeteria',
        distance: 89,
        isOpen: true,
        openingHours: '7:00 AM - 9:00 PM',
        icon: 'food',
      },
      {
        id: '4',
        name: 'Sports Complex',
        type: 'gym',
        distance: 560,
        isOpen: false,
        openingHours: '6:00 AM - 10:00 PM',
        icon: 'dumbbell',
      },
    ];

    setFacilities(mockFacilities);
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${distance}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getFacilityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      library: theme.colors.primary,
      laboratory: theme.colors.tertiary,
      cafeteria: theme.colors.warning,
      gym: theme.colors.secondary,
      parking: theme.colors.outline,
    };
    return colors[type] || theme.colors.primary;
  };

  if (facilities.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Nearby Facilities</Text>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <IconButton
              icon="map-marker-outline"
              size={32}
              iconColor={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.emptyText}>
              Enable location to see nearby facilities
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Facilities</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {facilities.map((facility) => (
          <Card key={facility.id} style={styles.facilityCard}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <IconButton
                  icon={facility.icon}
                  size={20}
                  iconColor={getFacilityTypeColor(facility.type)}
                  style={styles.facilityIcon}
                />
                <View style={styles.statusContainer}>
                  <Chip
                    mode="flat"
                    compact
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor: facility.isOpen
                          ? theme.colors.tertiaryContainer
                          : theme.colors.errorContainer,
                      },
                    ]}
                    textStyle={styles.statusText}
                  >
                    {facility.isOpen ? 'Open' : 'Closed'}
                  </Chip>
                </View>
              </View>

              <Text style={styles.facilityName}>{facility.name}</Text>
              
              <View style={styles.infoRow}>
                <IconButton
                  icon="map-marker"
                  size={14}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.infoIcon}
                />
                <Text style={styles.distance}>
                  {formatDistance(facility.distance)} away
                </Text>
              </View>

              <View style={styles.infoRow}>
                <IconButton
                  icon="clock-outline"
                  size={14}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={styles.infoIcon}
                />
                <Text style={styles.hours} numberOfLines={1}>
                  {facility.openingHours}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 16,
  },
  scrollContent: {
    paddingRight: 20,
  },
  facilityCard: {
    width: 200,
    marginRight: 12,
    borderRadius: 12,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  facilityIcon: {
    margin: 0,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  facilityName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    margin: 0,
    marginRight: 4,
  },
  distance: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  hours: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    flex: 1,
  },
  emptyCard: {
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
  },
});