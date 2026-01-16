package controllers

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	aivov1alpha1 "github.com/aivo/learner-ns-operator/api/v1alpha1"
)

const (
	finalizerName = "learnernamespace.aivo.io/finalizer"
)

// LearnerNamespaceReconciler reconciles a LearnerNamespace object
type LearnerNamespaceReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=aivo.io,resources=learnernamespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=aivo.io,resources=learnernamespaces/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=aivo.io,resources=learnernamespaces/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=resourcequotas,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=limitranges,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=networking.k8s.io,resources=networkpolicies,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=rbac.authorization.k8s.io,resources=roles;rolebindings,verbs=get;list;watch;create;update;patch;delete

func (r *LearnerNamespaceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Fetch the LearnerNamespace instance
	learnerNS := &aivov1alpha1.LearnerNamespace{}
	if err := r.Get(ctx, req.NamespacedName, learnerNS); err != nil {
		if errors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}
		logger.Error(err, "Failed to get LearnerNamespace")
		return ctrl.Result{}, err
	}

	// Handle deletion
	if !learnerNS.DeletionTimestamp.IsZero() {
		return r.handleDeletion(ctx, learnerNS)
	}

	// Add finalizer if not present
	if !controllerutil.ContainsFinalizer(learnerNS, finalizerName) {
		controllerutil.AddFinalizer(learnerNS, finalizerName)
		if err := r.Update(ctx, learnerNS); err != nil {
			return ctrl.Result{}, err
		}
	}

	// Create or update namespace
	if err := r.reconcileNamespace(ctx, learnerNS); err != nil {
		return r.updateStatusFailed(ctx, learnerNS, err)
	}

	// Create or update resource quota
	if err := r.reconcileResourceQuota(ctx, learnerNS); err != nil {
		return r.updateStatusFailed(ctx, learnerNS, err)
	}

	// Create or update limit range
	if err := r.reconcileLimitRange(ctx, learnerNS); err != nil {
		return r.updateStatusFailed(ctx, learnerNS, err)
	}

	// Create or update network policies
	if learnerNS.Spec.NetworkPolicies {
		if err := r.reconcileNetworkPolicies(ctx, learnerNS); err != nil {
			return r.updateStatusFailed(ctx, learnerNS, err)
		}
	}

	// Create or update RBAC
	if err := r.reconcileRBAC(ctx, learnerNS); err != nil {
		return r.updateStatusFailed(ctx, learnerNS, err)
	}

	// Update status to Active
	return r.updateStatusActive(ctx, learnerNS)
}

func (r *LearnerNamespaceReconciler) handleDeletion(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	if controllerutil.ContainsFinalizer(learnerNS, finalizerName) {
		// Update status to Terminating
		learnerNS.Status.Phase = "Terminating"
		if err := r.Status().Update(ctx, learnerNS); err != nil {
			return ctrl.Result{}, err
		}

		// Delete the namespace
		ns := &corev1.Namespace{}
		nsName := learnerNS.GetNamespaceName()
		if err := r.Get(ctx, types.NamespacedName{Name: nsName}, ns); err == nil {
			if err := r.Delete(ctx, ns); err != nil && !errors.IsNotFound(err) {
				logger.Error(err, "Failed to delete namespace", "namespace", nsName)
				return ctrl.Result{}, err
			}
		}

		// Remove finalizer
		controllerutil.RemoveFinalizer(learnerNS, finalizerName)
		if err := r.Update(ctx, learnerNS); err != nil {
			return ctrl.Result{}, err
		}
	}

	return ctrl.Result{}, nil
}

func (r *LearnerNamespaceReconciler) reconcileNamespace(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) error {
	nsName := learnerNS.GetNamespaceName()

	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: nsName,
			Labels: map[string]string{
				"aivo.io/tenant-id":  learnerNS.Spec.TenantID,
				"aivo.io/learner-id": learnerNS.Spec.LearnerID,
				"aivo.io/managed-by": "learner-ns-operator",
				"aivo.io/tier":       learnerNS.Spec.Tier,
			},
			Annotations: map[string]string{
				"aivo.io/display-name": learnerNS.Spec.DisplayName,
			},
		},
	}

	// Merge custom labels and annotations
	for k, v := range learnerNS.Spec.Labels {
		ns.Labels[k] = v
	}
	for k, v := range learnerNS.Spec.Annotations {
		ns.Annotations[k] = v
	}

	existingNS := &corev1.Namespace{}
	if err := r.Get(ctx, types.NamespacedName{Name: nsName}, existingNS); err != nil {
		if errors.IsNotFound(err) {
			return r.Create(ctx, ns)
		}
		return err
	}

	// Update existing namespace labels/annotations
	existingNS.Labels = ns.Labels
	existingNS.Annotations = ns.Annotations
	return r.Update(ctx, existingNS)
}

func (r *LearnerNamespaceReconciler) reconcileResourceQuota(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) error {
	nsName := learnerNS.GetNamespaceName()

	quota := &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "learner-quota",
			Namespace: nsName,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: learnerNS.GetResourceQuota(),
		},
	}

	existingQuota := &corev1.ResourceQuota{}
	if err := r.Get(ctx, types.NamespacedName{Name: quota.Name, Namespace: nsName}, existingQuota); err != nil {
		if errors.IsNotFound(err) {
			return r.Create(ctx, quota)
		}
		return err
	}

	existingQuota.Spec.Hard = quota.Spec.Hard
	return r.Update(ctx, existingQuota)
}

func (r *LearnerNamespaceReconciler) reconcileLimitRange(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) error {
	nsName := learnerNS.GetNamespaceName()

	limitRange := &corev1.LimitRange{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "learner-limits",
			Namespace: nsName,
		},
		Spec: corev1.LimitRangeSpec{
			Limits: []corev1.LimitRangeItem{
				{
					Type: corev1.LimitTypeContainer,
					Default: corev1.ResourceList{
						corev1.ResourceCPU:    mustParseQuantity("500m"),
						corev1.ResourceMemory: mustParseQuantity("512Mi"),
					},
					DefaultRequest: corev1.ResourceList{
						corev1.ResourceCPU:    mustParseQuantity("100m"),
						corev1.ResourceMemory: mustParseQuantity("128Mi"),
					},
					Max: corev1.ResourceList{
						corev1.ResourceCPU:    mustParseQuantity("2"),
						corev1.ResourceMemory: mustParseQuantity("4Gi"),
					},
				},
			},
		},
	}

	existingLR := &corev1.LimitRange{}
	if err := r.Get(ctx, types.NamespacedName{Name: limitRange.Name, Namespace: nsName}, existingLR); err != nil {
		if errors.IsNotFound(err) {
			return r.Create(ctx, limitRange)
		}
		return err
	}

	existingLR.Spec = limitRange.Spec
	return r.Update(ctx, existingLR)
}

func (r *LearnerNamespaceReconciler) reconcileNetworkPolicies(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) error {
	nsName := learnerNS.GetNamespaceName()

	// Default deny all ingress
	denyAllIngress := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "deny-all-ingress",
			Namespace: nsName,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{},
			PolicyTypes: []networkingv1.PolicyType{
				networkingv1.PolicyTypeIngress,
			},
		},
	}

	// Allow internal namespace traffic
	allowInternal := &networkingv1.NetworkPolicy{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "allow-internal",
			Namespace: nsName,
		},
		Spec: networkingv1.NetworkPolicySpec{
			PodSelector: metav1.LabelSelector{},
			Ingress: []networkingv1.NetworkPolicyIngressRule{
				{
					From: []networkingv1.NetworkPolicyPeer{
						{
							NamespaceSelector: &metav1.LabelSelector{
								MatchLabels: map[string]string{
									"kubernetes.io/metadata.name": nsName,
								},
							},
						},
					},
				},
			},
			PolicyTypes: []networkingv1.PolicyType{
				networkingv1.PolicyTypeIngress,
			},
		},
	}

	policies := []*networkingv1.NetworkPolicy{denyAllIngress, allowInternal}

	for _, policy := range policies {
		existing := &networkingv1.NetworkPolicy{}
		if err := r.Get(ctx, types.NamespacedName{Name: policy.Name, Namespace: nsName}, existing); err != nil {
			if errors.IsNotFound(err) {
				if err := r.Create(ctx, policy); err != nil {
					return err
				}
				continue
			}
			return err
		}
		existing.Spec = policy.Spec
		if err := r.Update(ctx, existing); err != nil {
			return err
		}
	}

	return nil
}

func (r *LearnerNamespaceReconciler) reconcileRBAC(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) error {
	nsName := learnerNS.GetNamespaceName()

	// Create a role for the learner
	role := &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "learner-role",
			Namespace: nsName,
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{""},
				Resources: []string{"pods", "services", "configmaps", "secrets"},
				Verbs:     []string{"get", "list", "watch", "create", "update", "patch", "delete"},
			},
			{
				APIGroups: []string{"apps"},
				Resources: []string{"deployments", "replicasets"},
				Verbs:     []string{"get", "list", "watch", "create", "update", "patch", "delete"},
			},
			{
				APIGroups: []string{"batch"},
				Resources: []string{"jobs", "cronjobs"},
				Verbs:     []string{"get", "list", "watch", "create", "update", "patch", "delete"},
			},
		},
	}

	existingRole := &rbacv1.Role{}
	if err := r.Get(ctx, types.NamespacedName{Name: role.Name, Namespace: nsName}, existingRole); err != nil {
		if errors.IsNotFound(err) {
			if err := r.Create(ctx, role); err != nil {
				return err
			}
		} else {
			return err
		}
	} else {
		existingRole.Rules = role.Rules
		if err := r.Update(ctx, existingRole); err != nil {
			return err
		}
	}

	// Create role binding
	roleBinding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "learner-rolebinding",
			Namespace: nsName,
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "Role",
			Name:     "learner-role",
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      "default",
				Namespace: nsName,
			},
		},
	}

	existingRB := &rbacv1.RoleBinding{}
	if err := r.Get(ctx, types.NamespacedName{Name: roleBinding.Name, Namespace: nsName}, existingRB); err != nil {
		if errors.IsNotFound(err) {
			return r.Create(ctx, roleBinding)
		}
		return err
	}

	existingRB.RoleRef = roleBinding.RoleRef
	existingRB.Subjects = roleBinding.Subjects
	return r.Update(ctx, existingRB)
}

func (r *LearnerNamespaceReconciler) updateStatusFailed(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace, err error) (ctrl.Result, error) {
	learnerNS.Status.Phase = "Failed"
	learnerNS.Status.Conditions = append(learnerNS.Status.Conditions, metav1.Condition{
		Type:               "Ready",
		Status:             metav1.ConditionFalse,
		Reason:             "ReconcileFailed",
		Message:            err.Error(),
		LastTransitionTime: metav1.Now(),
	})
	if updateErr := r.Status().Update(ctx, learnerNS); updateErr != nil {
		return ctrl.Result{}, updateErr
	}
	return ctrl.Result{RequeueAfter: time.Minute}, err
}

func (r *LearnerNamespaceReconciler) updateStatusActive(ctx context.Context, learnerNS *aivov1alpha1.LearnerNamespace) (ctrl.Result, error) {
	now := metav1.Now()
	learnerNS.Status.Phase = "Active"
	learnerNS.Status.NamespaceName = learnerNS.GetNamespaceName()
	learnerNS.Status.LastActivityTime = &now

	if learnerNS.Status.CreatedAt == nil {
		learnerNS.Status.CreatedAt = &now
	}

	// Set expiry if TTL is configured
	if learnerNS.Spec.TTL != "" {
		duration, err := time.ParseDuration(learnerNS.Spec.TTL)
		if err == nil {
			expiresAt := metav1.NewTime(learnerNS.Status.CreatedAt.Add(duration))
			learnerNS.Status.ExpiresAt = &expiresAt
		}
	}

	learnerNS.Status.Conditions = []metav1.Condition{
		{
			Type:               "Ready",
			Status:             metav1.ConditionTrue,
			Reason:             "ReconcileSucceeded",
			Message:            "Namespace is active and ready",
			LastTransitionTime: now,
		},
	}

	if err := r.Status().Update(ctx, learnerNS); err != nil {
		return ctrl.Result{}, err
	}

	// Requeue for TTL check if configured
	if learnerNS.Status.ExpiresAt != nil {
		remaining := time.Until(learnerNS.Status.ExpiresAt.Time)
		if remaining > 0 {
			return ctrl.Result{RequeueAfter: remaining}, nil
		}
	}

	return ctrl.Result{RequeueAfter: 5 * time.Minute}, nil
}

func (r *LearnerNamespaceReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&aivov1alpha1.LearnerNamespace{}).
		Owns(&corev1.Namespace{}).
		Complete(r)
}

func mustParseQuantity(s string) resource.Quantity {
	q, _ := resource.ParseQuantity(s)
	return q
}
