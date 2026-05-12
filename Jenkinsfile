pipeline {
    agent any

    environment {
        DEPLOY_DIR = '/home/ubuntu/flow-backend'
        COMPOSE_FILE = '/home/ubuntu/flow-backend/docker-compose.yml'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Install Dependencies') {
            parallel {
                stage('Shared Package') {
                    steps {
                        dir('FLOW_Backend/backend/shared') {
                            sh 'npm ci'
                            sh 'npm run build'
                        }
                    }
                }
                stage('Monolith') {
                    steps {
                        dir('FLOW_Backend/backend/monolith') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Gateway') {
                    steps {
                        dir('FLOW_Backend/backend/gateway') {
                            sh 'npm ci'
                        }
                    }
                }
                stage('Realtime') {
                    steps {
                        dir('FLOW_Backend/backend/realtime') {
                            sh 'npm ci'
                        }
                    }
                }
            }
        }

        stage('TypeScript Compile Check') {
            parallel {
                stage('Monolith') {
                    steps {
                        dir('FLOW_Backend/backend') {
                            sh 'npx tsc --noEmit --project monolith/tsconfig.json'
                        }
                    }
                }
                stage('Gateway') {
                    steps {
                        dir('FLOW_Backend/backend') {
                            sh 'npx tsc --noEmit --project gateway/tsconfig.json'
                        }
                    }
                }
                stage('Realtime') {
                    steps {
                        dir('FLOW_Backend/backend') {
                            sh 'npx tsc --noEmit --project realtime/tsconfig.json'
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                dir('FLOW_Backend/backend') {
                    sh """
                        docker build \
                            --target monolith \
                            -t flow-monolith:${BUILD_TAG} \
                            -t flow-monolith:latest \
                            .
                        
                        docker build \
                            --target gateway \
                            -t flow-gateway:${BUILD_TAG} \
                            -t flow-gateway:latest \
                            .
                        
                        docker build \
                            --target realtime \
                            -t flow-realtime:${BUILD_TAG} \
                            -t flow-realtime:latest \
                            .
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('FLOW_Backend/backend') {
                    // Ensure deploy directory exists with .env
                    sh '''
                        mkdir -p ${DEPLOY_DIR}
                        
                        # Copy compose file
                        cp docker-compose.yml ${DEPLOY_DIR}/
                        
                        # Check if .env exists (created manually once)
                        if [ ! -f "${DEPLOY_DIR}/.env" ]; then
                            echo "ERROR: ${DEPLOY_DIR}/.env not found!"
                            echo "Create it from .env.example and fill in your secrets:"
                            echo "  cp ${DEPLOY_DIR}/.env.example ${DEPLOY_DIR}/.env"
                            echo "  nano ${DEPLOY_DIR}/.env"
                            exit 1
                        fi
                        
                        # Deploy
                        cd ${DEPLOY_DIR}
                        docker-compose -f docker-compose.yml -p flow-backend down --remove-orphans || true
                        docker-compose -f docker-compose.yml -p flow-backend up -d
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    // Wait for services to start
                    sleep(time: 30, unit: 'SECONDS')
                    
                    // Check gateway
                    sh '''
                        MAX_RETRIES=12
                        RETRY=0
                        while [ $RETRY -lt $MAX_RETRIES ]; do
                            if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
                                echo "Gateway: HEALTHY"
                                break
                            fi
                            RETRY=$((RETRY + 1))
                            echo "Gateway check $RETRY/$MAX_RETRIES..."
                            sleep 5
                        done
                        if [ $RETRY -eq $MAX_RETRIES ]; then
                            echo "Gateway health check FAILED"
                            docker-compose -f ${COMPOSE_FILE} logs gateway --tail=50
                            exit 1
                        fi
                    '''
                    
                    // Check monolith through gateway
                    sh '''
                        MAX_RETRIES=12
                        RETRY=0
                        while [ $RETRY -lt $MAX_RETRIES ]; do
                            if curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
                                echo "Monolith: HEALTHY"
                                break
                            fi
                            RETRY=$((RETRY + 1))
                            echo "Monolith check $RETRY/$MAX_RETRIES..."
                            sleep 5
                        done
                        if [ $RETRY -eq $MAX_RETRIES ]; then
                            echo "Monolith health check FAILED"
                            docker-compose -f ${COMPOSE_FILE} logs monolith --tail=50
                            exit 1
                        fi
                    '''
                    
                    // Check realtime
                    sh '''
                        MAX_RETRIES=12
                        RETRY=0
                        while [ $RETRY -lt $MAX_RETRIES ]; do
                            if curl -sf http://localhost:3005/health >/dev/null 2>&1; then
                                echo "Realtime: HEALTHY"
                                break
                            fi
                            RETRY=$((RETRY + 1))
                            echo "Realtime check $RETRY/$MAX_RETRIES..."
                            sleep 5
                        done
                        if [ $RETRY -eq $MAX_RETRIES ]; then
                            echo "Realtime health check FAILED"
                            docker-compose -f ${COMPOSE_FILE} logs realtime --tail=50
                            exit 1
                        fi
                    '''
                    
                    echo 'All health checks passed!'
                }
            }
        }
    }

    post {
        always {
            // Cleanup local build images to save disk space
            sh '''
                docker rmi flow-monolith:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-gateway:${BUILD_TAG} 2>/dev/null || true
                docker rmi flow-realtime:${BUILD_TAG} 2>/dev/null || true
                docker system prune -f 2>/dev/null || true
            '''
        }
        success {
            echo """
            ==========================================
            Deployment Successful! Build: ${BUILD_TAG}
            ==========================================
            Gateway API: http://YOUR_EC2_IP:3000
            Realtime WS: http://YOUR_EC2_IP:3005
            ==========================================
            """
        }
        failure {
            echo "Deployment failed! Check logs above."
        }
    }
}