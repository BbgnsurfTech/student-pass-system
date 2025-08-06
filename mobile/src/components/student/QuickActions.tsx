import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, IconButton, Surface } from 'react-native-paper';
import { theme } from '../../styles/theme';

interface QuickActionsProps {
  onNewApplication: () => void;
}

export function QuickActions({ onNewApplication }: QuickActionsProps) {
  const actions = [
    {
      id: 'new-application',
      title: 'Apply for Pass',
      subtitle: 'New application',
      icon: 'plus-circle',
      color: theme.colors.primary,
      onPress: onNewApplication,
    },
    {
      id: 'renew',
      title: 'Renew Pass',
      subtitle: 'Extend validity',
      icon: 'refresh',
      color: theme.colors.secondary,
      onPress: () => {},
    },
    {
      id: 'support',
      title: 'Get Help',
      subtitle: 'Contact support',
      icon: 'help-circle',
      color: theme.colors.tertiary,
      onPress: () => {},
    },
    {
      id: 'report',
      title: 'Report Issue',
      subtitle: 'Technical problem',
      icon: 'alert-circle',
      color: theme.colors.warning,
      onPress: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((action, index) => (
          <Surface key={action.id} style={styles.actionCard} elevation={2}>
            <Card style={styles.card} onPress={action.onPress}>
              <Card.Content style={styles.cardContent}>
                <IconButton
                  icon={action.icon}
                  size={24}
                  iconColor={action.color}
                  style={styles.actionIcon}
                />
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </Card.Content>
            </Card>
          </Surface>
        ))}
      </View>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    borderRadius: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'transparent',
  },
  cardContent: {
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    margin: 0,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});