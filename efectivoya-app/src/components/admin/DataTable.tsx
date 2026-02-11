import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { useResponsive } from '../../hooks/useResponsive';

export interface Column<T> {
  key: string;
  title: string;
  flex?: number;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowPress?: (item: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, onRowPress, emptyMessage = 'Sin datos' }: DataTableProps<T>) {
  const { isMobile } = useResponsive();

  const tableContent = (
    <View style={[styles.container, isMobile && { minWidth: columns.length * 140 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        {columns.map((col) => (
          <Text key={col.key} style={[styles.headerCell, { flex: col.flex ?? 1 }]}>
            {col.title}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {data.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        data.map((item, index) => {
          const rowContent = (
            <View
              key={index}
              style={[styles.dataRow, index % 2 === 0 && styles.dataRowAlt]}
            >
              {columns.map((col) => (
                <View key={col.key} style={{ flex: col.flex ?? 1 }}>
                  {col.render ? (
                    col.render(item)
                  ) : (
                    <Text style={styles.cell} numberOfLines={1}>
                      {String((item as any)[col.key] ?? '')}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          );

          if (onRowPress) {
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onRowPress(item)}
                activeOpacity={0.6}
              >
                {rowContent}
              </TouchableOpacity>
            );
          }

          return rowContent;
        })
      )}
    </View>
  );

  if (isMobile) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        {tableContent}
      </ScrollView>
    );
  }

  return tableContent;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dataRowAlt: {
    backgroundColor: `${Colors.lightGray}80`,
  },
  cell: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
  },
  emptyRow: {
    padding: Layout.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
  },
});
