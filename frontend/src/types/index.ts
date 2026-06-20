export interface DashboardStats {
  total_events: number;
  active_events: number;
  high_impact_events: number;
  top_junction: string;
  junctions_count: number;
  zones_count: number;
  event_type_distribution: Record<string, number>;
  impact_distribution: Record<string, number>;
  cause_distribution: Record<string, number>;
  corridor_distribution: Record<string, number>;
  time_series: Record<string, number>;
  metrics: {
    impact_accuracy?: number;
    resolution_mae?: number;
    resolution_r2?: number;
    cascade_accuracy?: number;
  };
}

export interface VulnerabilityItem {
  junction: string;
  risk_score: number;
  risk_category: string;
  event_count: number;
  avg_resolution_minutes: number;
  high_priority_ratio: number;
  closure_ratio: number;
}

export interface PredictionInput {
  event_type: string;
  event_cause: string;
  priority: string;
  requires_road_closure: boolean;
  corridor: string;
  zone: string;
  junction: string;
  hour: number;
}

export interface PredictionResult {
  impact_level: number;
  impact_label: string;
  impact_color: string;
  impact_probabilities: number[];
  confidence: number;
  resolution_minutes: number;
  cascade_prediction: number;
  cascade_probability: number;
  cascade_label: string;
  resources: ResourceRecommendation;
}

export interface ResourceRecommendation {
  officers: number;
  barricades: number;
  monitoring: string;
  diversion: string;
  impact: string;
  description: string;
}

export interface SimilarityInput {
  event_cause: string;
  corridor: string;
  zone: string;
  junction: string;
  event_type: string;
  priority: string;
}

export interface SimilarEvent {
  event_id: string;
  event_cause: string;
  corridor: string;
  zone: string;
  junction: string;
  priority: string;
  impact_level: number;
  impact_label: string;
  resolution_minutes: number;
  similarity_score: number;
}

export interface HotspotSummary {
  causes: Record<string, number>;
}

export interface AutopsyEvent {
  id: string;
  event_cause: string;
  corridor: string;
  junction: string;
  resolution_minutes: number;
  priority: string;
  impact_level: number;
  impact_label: string;
}

export interface AutopsyResult {
  point_of_no_return_minutes: number;
  point_of_no_return_time: string;
  decision_window_minutes: number;
  actual_resolution_minutes: number;
  potential_delay_saved: number;
  cascade_prevented: boolean;
  event_start: string;
  event_start_dt: string;
}

export interface TimelineItem {
  time: string;
  event: string;
  type: string;
}

export interface AutopsyResponse {
  event: AutopsyEvent;
  autopsy: AutopsyResult | null;
  timeline: TimelineItem[];
}

export interface ResourceInput {
  event_cause: string;
  priority: string;
  corridor: string;
  hour: number;
  requires_road_closure: boolean;
}

export interface ResourceResponse {
  impact_level: number;
  impact_label: string;
  resources: ResourceRecommendation;
  reference_table: {
    impact: string;
    officers: number;
    barricades: number;
    monitoring: string;
    diversion: string;
  }[];
}
