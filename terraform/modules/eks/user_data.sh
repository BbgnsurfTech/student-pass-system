#!/bin/bash

# EKS Worker Node User Data Script
set -o xtrace

# Bootstrap the node
/etc/eks/bootstrap.sh ${cluster_name} ${bootstrap_arguments}

# Install additional packages
yum update -y
yum install -y amazon-cloudwatch-agent
yum install -y aws-cli

# Configure CloudWatch agent
cat <<EOF > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
{
    "metrics": {
        "namespace": "EKS/Node",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ],
                "totalcpu": false
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "diskio": {
                "measurement": [
                    "io_time"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            },
            "netstat": {
                "measurement": [
                    "tcp_established",
                    "tcp_time_wait"
                ],
                "metrics_collection_interval": 60
            },
            "swap": {
                "measurement": [
                    "swap_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    },
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/messages",
                        "log_group_name": "/aws/eks/${cluster_name}/node/system",
                        "log_stream_name": "{instance_id}/messages"
                    },
                    {
                        "file_path": "/var/log/dmesg",
                        "log_group_name": "/aws/eks/${cluster_name}/node/system",
                        "log_stream_name": "{instance_id}/dmesg"
                    }
                ]
            }
        }
    }
}
EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Set up log rotation
cat <<EOF > /etc/logrotate.d/kubernetes
/var/log/pods/*/*/*.log {
    daily
    missingok
    rotate 5
    compress
    notifempty
    create 0644 root root
    postrotate
        /bin/kill -USR1 \$(cat /var/run/rsyslogd.pid 2> /dev/null) 2> /dev/null || true
    endscript
}
EOF

# Install node problem detector
kubectl apply -f https://k8s.io/examples/debug/node-problem-detector-daemonset.yaml || true

# Set up custom metrics
cat <<EOF > /etc/kubernetes/node-metrics.sh
#!/bin/bash
# Custom node metrics collection
echo "node_custom_metric{type=\"disk_usage\"} \$(df / | tail -1 | awk '{print \$5}' | sed 's/%//')" | curl -X POST --data-binary @- http://localhost:9100/metrics/job/node-custom/instance/\$(hostname)
EOF

chmod +x /etc/kubernetes/node-metrics.sh
echo "*/5 * * * * /etc/kubernetes/node-metrics.sh" | crontab -

# Signal that the node is ready
/opt/aws/bin/cfn-signal -e \$? --stack \${AWS::StackName} --resource NodeGroup --region \${AWS::Region}