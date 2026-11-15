import { Tabs } from 'expo-router/js-tabs';
import { Camera, ClipboardList, FileText, Folder, House } from 'lucide-react-native';
import { View } from 'react-native';

import { TabBar } from '@/components/tab-bar';
import { colors } from '@/lib/theme';

/** Floating bottom navigation with a central red camera "Check" button (spec §4.1). */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <House color={color} size={size} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: 'Items',
          tabBarAccessibilityLabel: 'My Items',
          tabBarIcon: ({ color, size, focused }) => (
            <ClipboardList color={color} size={size} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="check"
        options={{
          title: 'Check',
          tabBarShowLabel: false,
          tabBarAccessibilityLabel: 'Check a paper',
          tabBarIcon: ({ focused }) => (
            <View
              className="h-[52px] w-[52px] items-center justify-center rounded-full bg-primary"
              style={{
                boxShadow: focused ? '0 6px 16px rgba(200, 49, 43, 0.40)' : '0 4px 12px rgba(200, 49, 43, 0.28)',
                transform: [{ scale: focused ? 1.04 : 1 }],
              }}
            >
              <Camera color="#fff" size={24} strokeWidth={2.2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="papers"
        options={{
          title: 'Papers',
          tabBarAccessibilityLabel: 'My Papers',
          tabBarIcon: ({ color, size, focused }) => (
            <FileText color={color} size={size} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: 'Folders',
          tabBarAccessibilityLabel: 'Paper folders by grade',
          tabBarIcon: ({ color, size, focused }) => (
            <Folder color={color} size={size} strokeWidth={focused ? 2.2 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
