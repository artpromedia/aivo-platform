package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// LearnerNamespaceSpec defines the desired state of LearnerNamespace
type LearnerNamespaceSpec struct {
	// TenantID is the tenant identifier
	TenantID string `json:"tenantId"`

	// LearnerID is the learner identifier
	LearnerID string `json:"learnerId"`

	// DisplayName is the human-readable name
	DisplayName string `json:"displayName,omitempty"`

	// Tier defines the resource tier (free, standard, premium)
	Tier string `json:"tier,omitempty"`

	// ResourceQuota defines the resource limits
	ResourceQuota *ResourceQuotaSpec `json:"resourceQuota,omitempty"`

	// NetworkPolicies enables network isolation
	NetworkPolicies bool `json:"networkPolicies,omitempty"`

	// AllowedImages restricts which container images can be used
	AllowedImages []string `json:"allowedImages,omitempty"`

	// Labels to apply to the namespace
	Labels map[string]string `json:"labels,omitempty"`

	// Annotations to apply to the namespace
	Annotations map[string]string `json:"annotations,omitempty"`

	// TTL defines how long the namespace should exist (duration string)
	TTL string `json:"ttl,omitempty"`

	// AutoCleanup enables automatic cleanup of idle namespaces
	AutoCleanup bool `json:"autoCleanup,omitempty"`

	// IdleTimeout defines idle timeout for cleanup (duration string)
	IdleTimeout string `json:"idleTimeout,omitempty"`
}

// ResourceQuotaSpec defines resource limits
type ResourceQuotaSpec struct {
	// CPU limit (e.g., "2")
	CPU string `json:"cpu,omitempty"`

	// Memory limit (e.g., "4Gi")
	Memory string `json:"memory,omitempty"`

	// Storage limit (e.g., "10Gi")
	Storage string `json:"storage,omitempty"`

	// Pods limit
	Pods int32 `json:"pods,omitempty"`

	// Services limit
	Services int32 `json:"services,omitempty"`

	// Secrets limit
	Secrets int32 `json:"secrets,omitempty"`

	// ConfigMaps limit
	ConfigMaps int32 `json:"configMaps,omitempty"`

	// PersistentVolumeClaims limit
	PersistentVolumeClaims int32 `json:"persistentVolumeClaims,omitempty"`
}

// LearnerNamespaceStatus defines the observed state of LearnerNamespace
type LearnerNamespaceStatus struct {
	// Phase is the current phase (Pending, Creating, Active, Terminating, Failed)
	Phase string `json:"phase,omitempty"`

	// NamespaceName is the actual K8s namespace name
	NamespaceName string `json:"namespaceName,omitempty"`

	// Conditions represent the latest available observations
	Conditions []metav1.Condition `json:"conditions,omitempty"`

	// ResourceUsage shows current resource usage
	ResourceUsage *ResourceUsageStatus `json:"resourceUsage,omitempty"`

	// LastActivityTime is the last time activity was detected
	LastActivityTime *metav1.Time `json:"lastActivityTime,omitempty"`

	// CreatedAt is when the namespace was created
	CreatedAt *metav1.Time `json:"createdAt,omitempty"`

	// ExpiresAt is when the namespace will be cleaned up (if TTL set)
	ExpiresAt *metav1.Time `json:"expiresAt,omitempty"`
}

// ResourceUsageStatus shows current resource usage
type ResourceUsageStatus struct {
	CPUUsed     string `json:"cpuUsed,omitempty"`
	MemoryUsed  string `json:"memoryUsed,omitempty"`
	StorageUsed string `json:"storageUsed,omitempty"`
	PodsUsed    int32  `json:"podsUsed,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:printcolumn:name="Tenant",type=string,JSONPath=`.spec.tenantId`
//+kubebuilder:printcolumn:name="Learner",type=string,JSONPath=`.spec.learnerId`
//+kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
//+kubebuilder:printcolumn:name="Namespace",type=string,JSONPath=`.status.namespaceName`
//+kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

// LearnerNamespace is the Schema for the learnernamespaces API
type LearnerNamespace struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   LearnerNamespaceSpec   `json:"spec,omitempty"`
	Status LearnerNamespaceStatus `json:"status,omitempty"`
}

//+kubebuilder:object:root=true

// LearnerNamespaceList contains a list of LearnerNamespace
type LearnerNamespaceList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []LearnerNamespace `json:"items"`
}

func init() {
	SchemeBuilder.Register(&LearnerNamespace{}, &LearnerNamespaceList{})
}

// Helper methods
func (r *LearnerNamespace) GetNamespaceName() string {
	if r.Status.NamespaceName != "" {
		return r.Status.NamespaceName
	}
	return "learner-" + r.Spec.TenantID + "-" + r.Spec.LearnerID
}

func (r *LearnerNamespace) GetResourceQuota() corev1.ResourceList {
	quota := corev1.ResourceList{}

	if r.Spec.ResourceQuota != nil {
		if r.Spec.ResourceQuota.CPU != "" {
			quota[corev1.ResourceLimitsCPU] = resource.MustParse(r.Spec.ResourceQuota.CPU)
			quota[corev1.ResourceRequestsCPU] = resource.MustParse(r.Spec.ResourceQuota.CPU)
		}
		if r.Spec.ResourceQuota.Memory != "" {
			quota[corev1.ResourceLimitsMemory] = resource.MustParse(r.Spec.ResourceQuota.Memory)
			quota[corev1.ResourceRequestsMemory] = resource.MustParse(r.Spec.ResourceQuota.Memory)
		}
		if r.Spec.ResourceQuota.Storage != "" {
			quota[corev1.ResourceRequestsStorage] = resource.MustParse(r.Spec.ResourceQuota.Storage)
		}
		if r.Spec.ResourceQuota.Pods > 0 {
			quota[corev1.ResourcePods] = *resource.NewQuantity(int64(r.Spec.ResourceQuota.Pods), resource.DecimalSI)
		}
	}

	return quota
}
