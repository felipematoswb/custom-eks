import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, SubnetType, CfnLaunchTemplate, InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { Cluster, KubernetesVersion, EndpointAccess, NodegroupAmiType, CapacityType, DefaultCapacityType } from 'aws-cdk-lib/aws-eks';
import { Key } from 'aws-cdk-lib/aws-kms';

export class CustomEksStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a custom VPC
    const vpc = new Vpc(this, 'TheVPC', {
      cidr: '10.0.0.0/21',
      maxAzs: 2,
      subnetConfiguration: [
        {
          subnetType: SubnetType.PUBLIC,
          name: 'Ingress',
          cidrMask: 24,
        },
        {
          cidrMask: 24,
          name: 'Application',
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        }
      ],
    });

    // Create Cluster
    const cluster = new Cluster(this, 'HelloEKS', {
      version: KubernetesVersion.V1_21,
      clusterName: 'HelloEks',
      secretsEncryptionKey: new Key(this, 'SecretsKey'),
      endpointAccess: EndpointAccess.PUBLIC_AND_PRIVATE,
      vpc,
      vpcSubnets: [{ subnetType: SubnetType.PRIVATE_WITH_NAT }],
      defaultCapacity: 0,
      defaultCapacityInstance: InstanceType.of(InstanceClass.T2, InstanceSize.MEDIUM),
      defaultCapacityType: DefaultCapacityType.EC2,
    });

    const lt = new CfnLaunchTemplate(this, 'LaunchTemplate', {
      launchTemplateData: {
        blockDeviceMappings: [{
          deviceName: '/dev/xvda',
          ebs: {
            deleteOnTermination: true,
            encrypted: true,
            volumeType: 'gp2',
            volumeSize: 30
          }
        }],
        instanceType: 't3.small',
      },
    });

    // Create lt custom NG
    cluster.addNodegroupCapacity('extra-ng', {
      launchTemplateSpec: {
        id: lt.ref,
        version: lt.attrLatestVersionNumber,
      },
      minSize: 1,
      amiType: NodegroupAmiType.AL2_X86_64,
      capacityType: CapacityType.SPOT,
    });

    // Create deploy Nginx
    // cluster.addHelmChart('NginxIngress', {
    //   chart: 'nginx-ingress-controller',
    //   repository: 'https://charts.bitnami.com/bitnami',
    //   namespace: 'default',
    //   release: 'my-release',
    //   values: {
    //     'metrics.enabled': true,
    //     'service.annotations': {
    //       "service.beta.kubernetes.io/aws-load-balancer-type": "nlb"
    //     }
    //   }
    // });

    // helm upgrade --install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx --namespace ingress-nginx --create-namespace

  }
}